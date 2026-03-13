using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCrypt.Net;
using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Tibcon.API.Models;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

// 1. Serilog Configuration
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .CreateLogger();

builder.Host.UseSerilog();

// 2. JWT Configuration
var jwtSettings = builder.Configuration.GetSection("Jwt");
var keyString = jwtSettings["Key"];
if (string.IsNullOrEmpty(keyString)) throw new Exception("JWT Key is missing in appsettings.json");
var key = Encoding.ASCII.GetBytes(keyString);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = ClaimTypes.Role
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("ADMIN"));
    options.AddPolicy("ManagerOrAdmin", policy => policy.RequireRole("ADMIN", "REGION_MANAGER"));
});

// 3. Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("fixed", opt =>
    {
        opt.Window = TimeSpan.FromSeconds(60);
        opt.PermitLimit = 1000;
    });
});

// 4. CORS - Dynamic & Secure
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(p => p
        .SetIsOriginAllowed(_ => true)
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials());
});

// Configure Forwarded Headers for Reverse Proxy (SSL/HTTPS support)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// 5. Database Connection
string connectionString = builder.Configuration.GetConnectionString("Default")!;

var app = builder.Build();

app.UseForwardedHeaders();
app.UseSerilogRequestLogging();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// --- API ENDPOINTS ---

// Health Check
app.MapGet("/health", async () => {
    try {
        using var db = new SqlConnection(connectionString);
        await db.OpenAsync();
        return Results.Ok(new { status = "UP", database = "CONNECTED", timestamp = DateTime.UtcNow });
    } catch (Exception ex) {
        return Results.Problem("Database connection failed: " + ex.Message);
    }
});

app.MapGet("/api/auth/me", [Authorize] (ClaimsPrincipal user) => {
    return Results.Ok(new {
        id = user.FindFirstValue(ClaimTypes.NameIdentifier),
        email = user.FindFirstValue(ClaimTypes.Email),
        role = user.FindFirstValue(ClaimTypes.Role),
        claims = user.Claims.Select(c => new { c.Type, c.Value })
    });
});

// AUTHENTICATION
app.MapGet("/api/auth/check-user", async (string email, ILogger<Program> logger) =>
{
    try {
        using var db = new SqlConnection(connectionString);
        var user = await db.QueryFirstOrDefaultAsync("SELECT PasswordHash FROM Users WHERE Email = @Email", new { Email = email.Trim() });
        if (user == null) return Results.Ok(new { exists = false });
        string? pwdHash = user.PasswordHash as string;
        return Results.Ok(new { exists = true, hasPassword = !string.IsNullOrEmpty(pwdHash) });
    } catch (Exception ex) {
        logger.LogError(ex, "Check-user error");
        return Results.Problem("Hata: " + ex.Message);
    }
});

app.MapPost("/api/auth/login", async ([FromBody] LoginRequest req, ILogger<Program> logger) =>
{
    try {
        using var db = new SqlConnection(connectionString);
        var user = await db.QueryFirstOrDefaultAsync<User>("SELECT * FROM Users WHERE Email = @Email", new { Email = req.Email.Trim() });
        if (user == null) return Results.Unauthorized();
        if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash)) return Results.Unauthorized();

        var tokenHandler = new JwtSecurityTokenHandler();
        var tokenDescriptor = new SecurityTokenDescriptor {
            Subject = new ClaimsIdentity(new[] { 
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), 
                new Claim(ClaimTypes.Email, user.Email), 
                new Claim(ClaimTypes.Role, (user.Role ?? "SALES").ToUpper()) 
            }),
            Expires = DateTime.UtcNow.AddMinutes(double.Parse(jwtSettings["ExpiryMinutes"]!)),
            Issuer = jwtSettings["Issuer"], Audience = jwtSettings["Audience"],
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        var accessToken = tokenHandler.WriteToken(token);
        var refreshToken = Guid.NewGuid().ToString();
        await db.ExecuteAsync("UPDATE Users SET RefreshToken = @refreshToken, RefreshTokenExpiry = @expiry WHERE Id = @id", new { refreshToken, expiry = DateTime.UtcNow.AddDays(double.Parse(jwtSettings["RefreshExpiryDays"]!)), id = user.Id });

        var cityIds = (await db.QueryAsync<int>("SELECT CityId FROM UserCities WHERE UserId = @id", new { id = user.Id })).ToList();
        var regionIds = (await db.QueryAsync<int>("SELECT RegionId FROM UserRegions WHERE UserId = @id", new { id = user.Id })).ToList();
        return Results.Ok(new AuthResponse(accessToken, refreshToken, new UserDto(user.Id, user.Email, user.DisplayName, (user.Role ?? "SALES").ToUpper(), cityIds, regionIds)));
    } catch (Exception ex) {
        logger.LogError(ex, "Login error");
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/api/auth/set-password", async ([FromBody] SetPasswordRequest req) =>
{
    using var db = new SqlConnection(connectionString);
    var user = await db.QueryFirstOrDefaultAsync<User>("SELECT Id, PasswordHash FROM Users WHERE Email = @Email", new { Email = req.Email.Trim() });
    if (user == null) return Results.NotFound();
    if (!string.IsNullOrEmpty(user.PasswordHash)) return Results.BadRequest("Şifre zaten belirlenmiş.");
    await db.ExecuteAsync("UPDATE Users SET PasswordHash = @hash WHERE Id = @id", new { hash = BCrypt.Net.BCrypt.HashPassword(req.Password), id = user.Id });
    return Results.Ok(new { success = true });
});

// REGIONS (BÖLGELER)
app.MapGet("/api/regions", [Authorize] async () => {
    using var db = new SqlConnection(connectionString);
    var regions = await db.QueryAsync<Region>("SELECT Id, Name, IsAbroad FROM Regions");
    foreach(var r in regions) {
        var cityIds = await db.QueryAsync<int>("SELECT Id FROM Cities WHERE RegionId = @id", new { id = r.Id });
        r.CityIds = cityIds.ToList();
    }
    return Results.Ok(new { success = true, data = regions });
});

app.MapPost("/api/regions", [Authorize(Roles = "ADMIN")] async ([FromBody] RegionRequest req) => {
    using var db = new SqlConnection(connectionString);
    var id = await db.QuerySingleAsync<int>("INSERT INTO Regions (Name, IsAbroad) OUTPUT INSERTED.Id VALUES (@Name, @IsAbroad)", req);
    if (req.CityIds != null) {
        foreach (var cityId in req.CityIds) await db.ExecuteAsync("UPDATE Cities SET RegionId = @regionId WHERE Id = @cityId", new { regionId = id, cityId });
    }
    return Results.Ok(new { success = true });
});

app.MapPut("/api/regions/{id}", [Authorize(Roles = "ADMIN")] async (int id, [FromBody] RegionRequest req) => {
    using var db = new SqlConnection(connectionString);
    await db.ExecuteAsync("UPDATE Regions SET Name = @Name, IsAbroad = @IsAbroad WHERE Id = @Id", new { req.Name, req.IsAbroad, Id = id });
    await db.ExecuteAsync("UPDATE Cities SET RegionId = NULL WHERE RegionId = @Id", new { Id = id });
    if (req.CityIds != null) {
        foreach (var cityId in req.CityIds) await db.ExecuteAsync("UPDATE Cities SET RegionId = @Id WHERE Id = @cityId", new { Id = id, cityId });
    }
    return Results.Ok(new { success = true });
});

app.MapDelete("/api/regions/{id}", [Authorize(Roles = "ADMIN")] async (int id) => {
    using var db = new SqlConnection(connectionString);
    await db.ExecuteAsync("UPDATE Cities SET RegionId = NULL WHERE RegionId = @id", new { id });
    await db.ExecuteAsync("DELETE FROM Regions WHERE Id = @id", new { id });
    return Results.Ok(new { success = true });
});

// CITIES & SALES POINTS
app.MapGet("/api/cities", [Authorize] async (int? regionId) => {
    using var db = new SqlConnection(connectionString);
    string q = "SELECT * FROM Cities";
    if (regionId.HasValue) q += " WHERE RegionId = @regionId";
    var cities = await db.QueryAsync<City>(q, new { regionId });
    return Results.Ok(new { success = true, data = cities });
});

app.MapPost("/api/cities", [Authorize(Roles = "ADMIN")] async ([FromBody] CityRequest req) => {
    using var db = new SqlConnection(connectionString);
    await db.ExecuteAsync("INSERT INTO Cities (Name) VALUES (@Name)", new { Name = req.Name.ToUpper() });
    return Results.Ok(new { success = true });
});

app.MapGet("/api/salesPoints", [Authorize] async (int? cityId) => {
    using var db = new SqlConnection(connectionString);
    string q = "SELECT C.*, Ci.Name AS CityName FROM Companies C LEFT JOIN Cities Ci ON C.CityId = Ci.Id WHERE 1=1";
    if (cityId.HasValue) q += " AND C.CityId = @cityId";
    var companies = await db.QueryAsync<Company>(q, new { cityId });
    return Results.Ok(new { success = true, data = companies });
});

app.MapPost("/api/salesPoints", [Authorize] async ([FromBody] Company comp) => {
    using var db = new SqlConnection(connectionString);
    var q = "INSERT INTO Companies (Name, CityId, District, GroupName, Address, Phone, Email) OUTPUT INSERTED.Id VALUES (@Name, @CityId, @District, @GroupName, @Address, @Phone, @Email)";
    var id = await db.QuerySingleAsync<int>(q, comp);
    return Results.Ok(new { success = true, id });
});

// QUOTES (TEKLİFLER)
app.MapGet("/api/quotes", [Authorize] async () => {
    using var db = new SqlConnection(connectionString);
    var quotes = await db.QueryAsync<Quote>("SELECT Q.*, C.Name AS CompanyName FROM Quotes Q LEFT JOIN Companies C ON Q.CompanyId = C.Id ORDER BY Q.CreatedAt DESC");
    return Results.Ok(new { success = true, data = quotes });
});

app.MapPost("/api/quotes", [Authorize] async ([FromBody] dynamic body) => {
    using var db = new SqlConnection(connectionString);
    var quote = body.quote;
    var items = body.items;
    var qId = "TBC" + DateTime.Now.ToString("yyyyMMddHHmmss");
    await db.ExecuteAsync("INSERT INTO Quotes (Id, CompanyId, UserId, TotalAmount, Currency, Status, ValidUntil, CreatedAt) VALUES (@Id, @CompanyId, @UserId, @TotalAmount, @Currency, @Status, @ValidUntil, GETDATE())", new { Id = qId, CompanyId = (int)quote.cariId, UserId = (int)quote.userId, TotalAmount = (decimal)quote.total, Currency = (string)quote.currency ?? "TRY", Status = (string)quote.status ?? "DRAFT", ValidUntil = (DateTime?)quote.validUntil });
    if (items != null) {
        foreach (var item in items) await db.ExecuteAsync("INSERT INTO QuoteItems (QuoteId, ProductCode, Name, Quantity, Price, Discount, LineTotal) VALUES (@qId, @ProductCode, @Name, @Quantity, @Price, @Discount, @LineTotal)", new { qId, ProductCode = (string)item.productCode, Name = (string)item.name, Quantity = (decimal)item.quantity, Price = (decimal)item.price, Discount = (decimal)item.discount, LineTotal = (decimal)item.lineTotal });
    }
    return Results.Ok(new { success = true, id = qId });
});

app.MapGet("/api/quotes/{id}", [Authorize] async (string id) => {
    using var db = new SqlConnection(connectionString);
    var quote = await db.QueryFirstOrDefaultAsync<Quote>("SELECT Q.*, C.Name AS CompanyName FROM Quotes Q LEFT JOIN Companies C ON Q.CompanyId = C.Id WHERE Q.Id = @id", new { id });
    if (quote == null) return Results.NotFound();
    var items = await db.QueryAsync<QuoteItem>("SELECT * FROM QuoteItems WHERE QuoteId = @id", new { id });
    return Results.Ok(new { success = true, data = quote, items });
});

app.MapPut("/api/quotes/{id}", [Authorize] async (string id, [FromBody] dynamic body) => {
    using var db = new SqlConnection(connectionString);
    await db.ExecuteAsync("UPDATE Quotes SET Status = @status WHERE Id = @id", new { status = (string)body.status, id });
    return Results.Ok(new { success = true });
});

// USERS & SETTINGS
app.MapGet("/api/users", [Authorize(Roles = "ADMIN")] async () => {
    using var db = new SqlConnection(connectionString);
    var users = await db.QueryAsync<User>("SELECT Id, Email, DisplayName, Role, IsActive FROM Users");
    var res = new List<object>();
    foreach(var u in users) {
        var cities = await db.QueryAsync<int>("SELECT CityId FROM UserCities WHERE UserId = @id", new { id = u.Id });
        var regions = await db.QueryAsync<int>("SELECT RegionId FROM UserRegions WHERE UserId = @id", new { id = u.Id });
        res.Add(new { u.Id, u.Email, u.DisplayName, u.Role, u.IsActive, CityIds = cities.ToList(), RegionIds = regions.ToList() });
    }
    return Results.Ok(new { success = true, data = res });
});

app.MapGet("/api/products", [Authorize] async () => {
    using var db = new SqlConnection(connectionString);
    return Results.Ok(new { success = true, data = await db.QueryAsync("SELECT * FROM Products") });
});

app.MapPost("/api/users", [Authorize(Roles = "ADMIN")] async ([FromBody] User upsertUser) => {
    using var db = new SqlConnection(connectionString);
    var existing = await db.QueryFirstOrDefaultAsync<User>("SELECT Id FROM Users WHERE Email = @Email", new { Email = upsertUser.Email?.Trim() });
    
    int userId;
    if (existing != null) {
        userId = existing.Id;
        string q = "UPDATE Users SET DisplayName=@DisplayName, Role=@Role, IsActive=@IsActive";
        if (!string.IsNullOrEmpty(upsertUser.PasswordHash)) {
            q += ", PasswordHash=@PasswordHash";
            upsertUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(upsertUser.PasswordHash);
        }
        q += " WHERE Id=@Id";
        upsertUser.Id = userId;
        await db.ExecuteAsync(q, upsertUser);
    } else {
        if (!string.IsNullOrEmpty(upsertUser.PasswordHash)) 
            upsertUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(upsertUser.PasswordHash);
        userId = await db.QuerySingleAsync<int>("INSERT INTO Users (Email, DisplayName, Role, IsActive, PasswordHash) OUTPUT INSERTED.Id VALUES (@Email, @DisplayName, @Role, @IsActive, @PasswordHash)", upsertUser);
    }

    // Sync Assignments
    await db.ExecuteAsync("DELETE FROM UserCities WHERE UserId = @userId", new { userId });
    foreach (var cityId in upsertUser.CityIds) {
        await db.ExecuteAsync("INSERT INTO UserCities (UserId, CityId) VALUES (@userId, @cityId)", new { userId, cityId });
    }

    await db.ExecuteAsync("DELETE FROM UserRegions WHERE UserId = @userId", new { userId });
    foreach (var regionId in upsertUser.RegionIds) {
        await db.ExecuteAsync("INSERT INTO UserRegions (UserId, RegionId) VALUES (@userId, @regionId)", new { userId, regionId });
    }

    return Results.Ok(new { success = true });
});

app.MapDelete("/api/users/{id}", [Authorize(Roles = "ADMIN")] async (int id) => {
    using var db = new SqlConnection(connectionString);
    await db.ExecuteAsync("DELETE FROM Users WHERE Id = @id", new { id });
    return Results.Ok(new { success = true });
});

app.MapGet("/api/visits", [Authorize] async (string? email, string? cityId) => {
    using var db = new SqlConnection(connectionString);
    string q = "SELECT V.*, C.Name AS CompanyName FROM Visits V LEFT JOIN Companies C ON V.CompanyId = C.Id WHERE 1=1";
    if (!string.IsNullOrEmpty(email)) q += " AND (SELECT Email FROM Users WHERE Id = V.UserId) = @email";
    if (!string.IsNullOrEmpty(cityId)) q += " AND V.CityId = @cityId";
    var visits = await db.QueryAsync<Visit>(q, new { email, cityId });
    return Results.Ok(new { success = true, data = visits });
});

app.MapPost("/api/visits", [Authorize] async ([FromBody] dynamic v) => {
    using var db = new SqlConnection(connectionString);
    var q = "INSERT INTO Visits (CompanyId, UserId, VisitDate, Note, PersonelName, CityId) VALUES (@CompanyId, @UserId, @VisitDate, @Note, @PersonelName, @CityId)";
    await db.ExecuteAsync(q, new { 
        CompanyId = (int?)v.cariId ?? (int?)v.companyId ?? 0,
        UserId = (int?)v.userId ?? 0,
        VisitDate = (DateTime?)v.ziyaretTarihi ?? (DateTime?)v.visitDate ?? DateTime.Now,
        Note = (string)v.ziyaretNotu ?? (string)v.note,
        PersonelName = (string)v.personelAdi ?? (string)v.personelName,
        CityId = (int?)v.cityId ?? 0
    });
    return Results.Ok(new { success = true });
});

app.MapGet("/api/settings", [Authorize] async () => {
    using var db = new SqlConnection(connectionString);
    var settings = await db.QueryAsync<Settings>("SELECT * FROM Settings");
    return Results.Ok(new { success = true, data = settings });
});

app.Run();
