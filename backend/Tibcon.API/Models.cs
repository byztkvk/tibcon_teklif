namespace Tibcon.API.Models;

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class SetPasswordRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RefreshRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}

public record AuthResponse(string AccessToken, string RefreshToken, UserDto User);
public record UserDto(int Id, string Email, string DisplayName, string Role, List<int> CityIds, List<int> RegionIds);

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    public bool IsActive { get; set; }
    public List<int> CityIds { get; set; } = new();
    public List<int> RegionIds { get; set; } = new();
}

public class Company
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int CityId { get; set; }
    public string? CityName { get; set; }
    public string? District { get; set; }
    public string? GroupName { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
}

public class Visit
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public string? CompanyName { get; set; }
    public int UserId { get; set; }
    public DateTime VisitDate { get; set; }
    public string? Note { get; set; }
    public string? PersonelName { get; set; }
    public int? CityId { get; set; }
}

public class Quote
{
    public string Id { get; set; } = string.Empty;
    public int CompanyId { get; set; }
    public string? CompanyName { get; set; }
    public int UserId { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "TRY";
    public string Status { get; set; } = "DRAFT";
    public DateTime? ValidUntil { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class QuoteItem
{
    public int Id { get; set; }
    public string QuoteId { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal Discount { get; set; }
    public decimal LineTotal { get; set; }
}

public class Region
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsAbroad { get; set; } = false;
    public List<int> CityIds { get; set; } = new();
}

public class City
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? RegionId { get; set; }
}

public class RegionRequest
{
    public string Name { get; set; } = string.Empty;
    public bool IsAbroad { get; set; }
    public List<int> CityIds { get; set; } = new();
}

public class CityRequest
{
    public string Name { get; set; } = string.Empty;
}

public class Settings
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}
