// --- GOOGLE APPS SCRIPT CODE ---
// Copy this ENTIRE code and replace your existing code.gs

// --- CONFIGURATION ---
const SHEET_PRODUCTS = "PRODUCTS";
const SHEET_QUOTES = "QUOTES";
const SHEET_QUOTE_LINES = "QUOTE_LINES";
const SHEET_USERS = "KULLANICILAR";
const SHEET_SETTINGS = "AYARLAR";
const SHEET_TERMS = "TEKLIF_SARTLARI";

// --- VISIT MODULE SHEETS ---
const SHEET_SALES_POINTS = "satis_noktalari"; // Sheet name in your file
const SHEET_VISITS = "Ziyaretler";
const SHEET_VISIT_PLANS = "ZiyaretPlan";
const SHEET_REGIONS = "BOLGELER";
const SHEET_AGENDA = "Ajanda";
const SHEET_MAP_HARMONIC = "HARMONIC_CAP_MAP";
const SHEET_MAP_PROTECTION = "CAP_PROTECTION_MAP";

// --- MAIN SETUP ---
function doGet(e) { return HtmlService.createHtmlOutput("Tibcon Backend Active"); }

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
        return json({ ok: false, message: "No data" });
    }
    
    var body = e.postData.contents;
    var postData = JSON.parse(body);
    var action = postData.action;

    // --- READ ACTIONS ---
    if (action == "listProducts") return listProducts();
    if (action == "listUsers") return listUsers();
    if (action == "listQuotes") return listQuotes();
    if (action == "getQuoteDetail") return getQuoteDetail(postData.id);
    if (action == "getSettings") return getSettings();
    if (action == "listTerms") return listTerms();
    
    // --- VISIT MODULE READ ACTIONS ---
    if (action == "listSalesPoints") return listSalesPoints(postData);
    if (action == "listVisits") return listVisits(postData);
    if (action == "listVisitPlans") return listVisitPlans();
    if (action == "listRegions") return listRegions();
    if (action == "listAgenda") return listAgenda(postData);
    if (action == "listMappings") return listMappings();

    // --- WRITE ACTIONS ---
    var lock = LockService.getScriptLock();
    if (lock.tryLock(10000)) {
        // --- WRITE ACTIONS ---
        if (action == "upsertUser") return upsertUser(postData);
        if (action == "deleteUser") return deleteUser(postData.email);
        if (action == "saveQuote") return saveQuote(postData);
        if (action == "saveSettings") return saveSettings(postData);
        if (action == "updateQuoteStatus") return updateQuoteStatus(postData);
        if (action == "saveTerm") return saveTerm(postData.term);
        if (action == "addRegion") return addRegion(postData);
        if (action == "deleteRegion") return deleteRegion(postData);

        // --- VISIT MODULE WRITE ACTIONS ---
        if (action == "addSalesPoint") return addSalesPoint(postData);
        if (action == "addVisit") return addVisit(postData);
        if (action == "addVisitPlan") return addVisitPlan(postData);
        if (action == "updateVisitPlanStatus") return updateVisitPlanStatus(postData);
        if (action == "requestPlanChange") return requestPlanChange(postData);
        if (action == "resolvePlanChange") return resolvePlanChange(postData);
        if (action == "saveAgendaItem") return saveAgendaItem(postData);
        if (action == "deleteAgendaItem") return deleteAgendaItem(postData);

        return json({ ok: false, message: "Unknown action: " + action });
    } else {
        return json({ ok: false, message: "Server busy" });
    }
  } catch (err) {
    return json({ ok: false, message: "Error: " + err.toString() });
  }
}

// --- VISIT FUNCTIONS ---
function listRegions() {
  var sheet = getSheet(SHEET_REGIONS);
  if (!sheet) return json({ ok: true, regions: [] });
  var data = sheet.getDataRange().getValues();
  var regions = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) regions.push(data[i][0]);
  }
  return json({ ok: true, regions: regions });
}

function addRegion(data) {
  var sheet = getSheet(SHEET_REGIONS) || SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_REGIONS);
  if (sheet.getLastRow() === 0) sheet.appendRow(["Region Name"]);
  
  sheet.appendRow([data.name]);
  return json({ ok: true, message: "Region added" });
}

function deleteRegion(data) {
  var sheet = getSheet(SHEET_REGIONS);
  if (!sheet) return json({ ok: false, message: "Sheet missing" });
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.name) {
      sheet.deleteRow(i + 1);
      return json({ ok: true, message: "Region deleted" });
    }
  }
  return json({ ok: false, message: "Region not found" });
}

// --- FIXED LIST SALES POINTS FUNCTION ---
function listSalesPoints(data) {
  // Use constant, but fallback to "SatisNoktalari" if not found
  var sheet = getSheet(SHEET_SALES_POINTS) || getSheet("SatisNoktalari");
  if (!sheet) return json({ ok: true, points: [] });
  
  var dataRange = sheet.getDataRange().getValues();
  // Safe header mapping
  var headers = (dataRange[0] || []).map(function(h) { return String(h).trim().toLowerCase(); });
  
  // Dynamic Column Mapping based on User Screenshot
  var colMap = {
    firmaAdi: headers.indexOf("firmaadi"),
    sehir: headers.indexOf("sehir"),
    ilce: headers.indexOf("ilce"),
    yetkili: headers.indexOf("yetkili"),
    statu: headers.indexOf("firmastatu"),
    salesEmail: headers.indexOf("email"), // Col F: Sales Rep Email
    satisPersoneli: headers.indexOf("satispersoneli"),
    tel: headers.indexOf("iletisim"),
    adres: headers.indexOf("adres"),
    vergiDairesi: headers.indexOf("vergi dairesi"),
    vergiNo: headers.indexOf("vergi no"),
    customerEmail: headers.indexOf("yetkili mail") // Col L: Customer Email
  };

  var points = [];
  
  for (var i = 1; i < dataRange.length; i++) {
    var row = dataRange[i];
    
    var firmaVal = colMap.firmaAdi > -1 ? row[colMap.firmaAdi] : "";
    if (!firmaVal) continue;

    // ID Logic: Use FirmaAdi as ID since there is no ID column
    var idVal = String(firmaVal).trim();
    
    points.push({
      id: idVal,
      FirmaAdi: String(firmaVal).trim(),
      Sehir: colMap.sehir > -1 ? String(row[colMap.sehir]) : "",
      ilce: colMap.ilce > -1 ? String(row[colMap.ilce]) : "",
      Yetkili: colMap.yetkili > -1 ? String(row[colMap.yetkili]) : "",
      FirmaStatu: colMap.statu > -1 ? String(row[colMap.statu]) : "",
      
      // Map both emails correctly for frontend usage
      FirmaEmail: colMap.salesEmail > -1 ? String(row[colMap.salesEmail]) : "", // Sales Rep Email in Col F
      YetkiliEmail: colMap.customerEmail > -1 ? String(row[colMap.customerEmail]) : "", // Customer Email in Col L
      
      Telefon: colMap.tel > -1 ? String(row[colMap.tel]) : "",
      Adres: colMap.adres > -1 ? String(row[colMap.adres]) : "",
      SatisPersoneli: colMap.satisPersoneli > -1 ? String(row[colMap.satisPersoneli]) : "",
      VergiDairesi: colMap.vergiDairesi > -1 ? String(row[colMap.vergiDairesi]) : "",
      VergiNo: colMap.vergiNo > -1 ? String(row[colMap.vergiNo]) : ""
    });
  }
  
  return json({ ok: true, points: points });
}

function addSalesPoint(data) {
  var sheet = getSheet(SHEET_SALES_POINTS) || getSheet("SatisNoktalari");
  if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_SALES_POINTS);
      // Create headers matching our mapping if new
      sheet.appendRow(["FirmaAdi", "Sehir", "ilce", "Yetkili", "FirmaStatu", "Email", "SatisPersoneli", "Iletisim", "Adres", "Vergi Dairesi", "Vergi No", "yetkili mail"]);
  }
  
  // NOTE: This insert logic depends on column order. 
  // If user inserts manually, it's fine. If we insert here, we should match the screenshot order:
  // FirmaAdi, Sehir, ilce, Yetkili, FirmaStatu, Email, SatisPersoneli, Iletisim, ADRES, VERGI DAIRESI, VERGI NO, yetkili mail
  
  // data comes from frontend with PascalCase keys (e.g. FirmaAdi, Sehir) 
  // or sometimes camelCase depending on the call. We'll check both.
  
  var fName = data.FirmaAdi || data.firmaAdi || "";
  var fCity = data.Sehir || data.sehir || data.İl || data.il || "";
  var fDistrict = data.ilce || data.Ilce || ""; // Note: ilce is lowercase in frontend state? Check page.tsx. It is "ilce" (lowercase i).
  var fAuth = data.Yetkili || data.yetkili || "";
  var fStatus = data.FirmaStatu || data.firmaStatu || "Potansiyel";
  var fRepEmail = data.SatisPersoneliEmail || data.satisPersoneliEmail || "";
  var fRepName = data.SatisPersoneliName || data.satisPersoneliName || data.olusturan || ""; // Frontend sends SatisPersoneliName
  var fTel = data.Telefon || data.telefon || data.tel || "";
  var fAddr = data.Adres || data.adres || "";
  var fTaxOff = data.VergiDairesi || data.vergiDairesi || "";
  var fTaxNo = data.VergiNo || data.vergiNo || "";
  var fCompEmail = data.FirmaEmail || data.firmaEmail || ""; // Customer/Company Email

  sheet.appendRow([
    fName,
    fCity,
    fDistrict,
    fAuth,
    fStatus,
    fRepEmail, // Column F: Sales Rep Email
    fRepName,  // Column G: Sales Person Name
    fTel,      // Column H: Tel
    fAddr,     // Column I: Adres
    fTaxOff,   // Column J: Vergi Diresi
    fTaxNo,    // Column K: Vergi No
    fCompEmail // Column L: Yetkili Mail
  ]);
  
  return json({ ok: true, message: "Sales point added" });
}

function addVisit(data) {
  var sheet = getSheet(SHEET_VISITS) || SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_VISITS);
  if (sheet.getLastRow() === 0) {
      // Headers matching Screenshot:
      // A:Yıl, B:Ay, C:Tarih, D:Bolge, E:Personel, F:Firma, G:Il, H:Ilce, I:Statu/Tip, J:Yetkili, K:Not, 
      // L:ID, M:Email, N:Tel, O:SonrakiAdim, P:Konum, Q:Fotos, R:PlanID
      sheet.appendRow(["Yıl", "Ay", "ZiyaretTarih", "Bölge", "SatisPersoneli", "FirmaAdi", "İl", "İlçe", "ZiyaretTipi", "YetkiliKisi", "ZiyaretNot", "ID", "SatisPersoneliEmail", "Tel", "SonrakiAdim", "Konum", "Fotoğraflar", "PlanID"]);
  }
  
  var d = new Date(data.ziyaretTarih || new Date());
  var yil = d.getFullYear();
  var ay = d.getMonth() + 1;

  var row = [
    yil,                            // A: Yıl
    ay,                             // B: Ay
    data.ziyaretTarih || "",        // C: ZiyaretTarih
    data.bolge || "",               // D: Bölge (Fixed!)
    data.satisPersoneli || "",      // E: SatisPersoneli
    data.firmaAdi || "",            // F: FirmaAdi
    data.il || "",                  // G: İl
    data.ilce || "",                // H: İlçe
    data.ziyaretTipi || "",         // I: FirmaStatu / ZiyaretTipi
    data.yetkiliKisi || "",         // J: YetkiliKisi
    data.ziyaretNot || "",          // K: ZiyaretNot
    
    // Technical/Extra Columns (L+)
    Utilities.getUuid(),            // L: ID (Moved here)
    data.satisPersoneliEmail || "", // M: Email
    data.tel || "",                 // N: Tel
    data.sonrakiAdim || "",         // O: Sonraki Adim
    data.konum || "",               // P: Konum
    data.fotograflar || "",         // Q: Fotoğraflar
    data.planId || ""               // R: PlanID
  ];
  
  sheet.appendRow(row);
  return json({ ok: true, message: "Visit added" });
}

function listVisits(data) {
    var sheet = getSheet(SHEET_VISITS);
    if (!sheet) return json({ ok: true, visits: [] });
    
    var dataRows = sheet.getDataRange().getValues();
    var visits = [];
    
    for (var i = 1; i < dataRows.length; i++) {
        var row = dataRows[i];
        // Mapping based on new order
        visits.push({
            id: row[11], // Col L -> Index 11
            SatisPersoneli: row[4], // Col E
            SatisPersoneliEmail: row[12], // Col M
            FirmaAdi: row[5], // Col F
            ZiyaretTarih: row[2] ? Utilities.formatDate(new Date(row[2]), Session.getScriptTimeZone(), "yyyy-MM-dd") : "", 
            İl: row[6], // Col G
            İlçe: row[7], // Col H
            Bölge: row[3], // Col D
            ZiyaretTipi: row[8], // Col I
            YetkiliKisi: row[9], // Col J
            ZiyaretNot: row[10], // Col K
            Tel: row[13], // Col N
            SonrakiAdim: row[14], // Col O
            Konum: row[15], // Col P
            Fotoğraflar: row[16], // Col Q
            PlanID: row[17] // Col R
        });
    }
    
    return json({ ok: true, visits: visits });
}

// --- VISIT PLAN FUNCTIONS ---
function addVisitPlan(data) {
  var sheet = getSheet(SHEET_VISIT_PLANS) || SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_VISIT_PLANS);
  if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID", "Firma", "Tarih", "Not", "Durum", "Atanan", "Olusturan", "Tarih_Olusturma", "Talep_Edilen_Tarih", "Talep_Aciklama"]);
  }
  
  var row = [
    data.id || Utilities.getUuid(),
    data.firmaAdi || "",
    data.plannedDate || "",
    data.notes || "",
    "PENDING",
    data.assignedTo || "",
    data.creatorId || "",
    new Date(),
    "", // ProposedDate
    ""  // ProposedNote
  ];
  
  sheet.appendRow(row);
  return json({ ok: true, message: "Plan added", id: row[0] });
}

function listVisitPlans() {
  var sheet = getSheet(SHEET_VISIT_PLANS);
  if (!sheet) return json({ ok: true, plans: [] });
  
  var data = sheet.getDataRange().getValues();
  var plans = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if(row[4] !== "CANCELLED") {
       plans.push({
        id: row[0],
        firmaAdi: row[1],
        plannedDate: Utilities.formatDate(new Date(row[2]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
        notes: row[3],
        status: row[4],
        assignedTo: row[5],
        creatorId: row[6],
        createdAt: row[7],
        proposedDate: row[8] ? Utilities.formatDate(new Date(row[8]), Session.getScriptTimeZone(), "yyyy-MM-dd") : null,
        proposedNote: row[9] || null
      });
    }
  }
  
  return json({ ok: true, plans: plans });
}

function updateVisitPlanStatus(data) {
  var sheet = getSheet(SHEET_VISIT_PLANS);
  if (!sheet) return json({ ok: false, message: "Sheet not found" });

  var id = data.id;
  var status = data.status;
  
  var range = sheet.getDataRange();
  var values = range.getValues();
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] == id) {
      sheet.getRange(i + 1, 5).setValue(status); 
      return json({ ok: true, message: "Status updated" });
    }
  }
  return json({ ok: false, message: "Plan not found" });
}

function requestPlanChange(data) {
    var sheet = getSheet(SHEET_VISIT_PLANS);
    if (!sheet) return json({ ok: false, message: "Sheet not found" });
    
    var range = sheet.getDataRange();
    var values = range.getValues();
    
    for (var i = 1; i < values.length; i++) {
        if (values[i][0] == data.id) {
            // Set ProposedDate (Col 9) and ProposedNote (Col 10)
            sheet.getRange(i + 1, 9).setValue(data.newDate);
            sheet.getRange(i + 1, 10).setValue(data.note);
            return json({ ok: true, message: "Change requested" });
        }
    }
    return json({ ok: false, message: "Plan not found" });
}

function resolvePlanChange(data) {
    var sheet = getSheet(SHEET_VISIT_PLANS);
    if (!sheet) return json({ ok: false, message: "Sheet not found" });
    
    var range = sheet.getDataRange();
    var values = range.getValues();
    
    for (var i = 1; i < values.length; i++) {
        if (values[i][0] == data.id) {
            if (data.decision === "APPROVED") {
               var newDate = values[i][8]; // ProposedDate
               var note = values[i][9]; // ProposedNote
               var currentNotes = values[i][3];
               
               // Updates: PlannedDate (Col 3) -> NewDate
               sheet.getRange(i + 1, 3).setValue(newDate);
               // Append note to main notes
               sheet.getRange(i + 1, 4).setValue(currentNotes + " [Değişiklik: " + note + "]");
               
               // Clear requests
               sheet.getRange(i + 1, 9).clearContent();
               sheet.getRange(i + 1, 10).clearContent();
               return json({ ok: true, message: "Approved and Updated" });
            } else {
               // Reject: Just clear fields
               sheet.getRange(i + 1, 9).clearContent();
               sheet.getRange(i + 1, 10).clearContent();
               return json({ ok: true, message: "Rejected" });
            }
        }
    }
    return json({ ok: false, message: "Plan not found" });
}

// --- INTERNAL HELPERS ---
function internal_getNextQuoteNo() {
    var year = 2026;
    var prefix = "TBC" + year;
    var sheet = getSheet(SHEET_QUOTES);
    var lastNum = 0;
    if (sheet) {
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
            var id = data[i][0] ? data[i][0].toString() : "";
            if (id.indexOf(prefix) === 0) {
                var numPartStr = id.substring(prefix.length);
                var numPart = parseInt(numPartStr, 10);
                if (!isNaN(numPart) && numPart > lastNum) lastNum = numPart;
            }
        }
    }
    var nextNum = lastNum + 1;
    return prefix + nextNum.toString().padStart(5, '0');
}

// --- PRODUCTS ---
// --- PRODUCTS ---
function listProducts() {
    var sheet = getSheet(SHEET_PRODUCTS);
    // Fallback if sheet name is different
    if (!sheet) sheet = getSheet("Urnler") || getSheet("Urunler") || getSheet("Ürünler");
    
    if (!sheet) return json({ ok: false, message: "Sheet not found: " + SHEET_PRODUCTS });
    
    var data = sheet.getDataRange().getValues();
    var products = [];
    
    // Headers:
    // A: UST_KATEGORI, B: GRUP_KODU, C: SIPARIS_KODU, D: URUN_KODU, E: URUN_ADI, 
    // F: DOVIZ_TURU, G: LISTE_FIYATI_2026, H: KVAR, I: VOLTAJ, J: P_PCT, K: AMP_A, L: URUN_TIPI
    
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (!row[4]) continue; 
        
        products.push({
            mainCategory: row[0],       // A
            groupCode: row[1],          // B
            orderCode: row[2],          // C
            productCode: row[3],        // D
            name: row[4],               // E
            currency: (row[5] && (row[5].toString().trim().toUpperCase() === "TL" || row[5].toString().trim().toUpperCase() === "TRY")) ? "TRY" : "USD", // F
            listPrice: row[6],          // G
            kvar: row[7],               // H
            voltage: row[8],            // I
            pPct: row[9],               // J
            ampA: row[10],              // K
            type: row[11]               // L (URUN_TIPI)
        });
    }
    return json({ ok: true, products: products });
}

function listMappings() {
    var res = { ok: true, harmonicMap: [], protectionMap: [] };
    
    var sheetH = getSheet(SHEET_MAP_HARMONIC);
    if (sheetH) {
        var dataH = sheetH.getDataRange().getValues();
        for (var i = 1; i < dataH.length; i++) {
            if (dataH[i][0]) res.harmonicMap.push({ gridV: dataH[i][0], pPct: dataH[i][1], capV: dataH[i][2] });
        }
    }
    
    var sheetP = getSheet(SHEET_MAP_PROTECTION);
    if (sheetP) {
        var dataP = sheetP.getDataRange().getValues();
        for (var j = 1; j < dataP.length; j++) {
            if (dataP[j][0]) res.protectionMap.push({ 
                capOrderCode: dataP[j][0], 
                nhFuseA: dataP[j][1], 
                mccbA: dataP[j][2], 
                contactorCode: dataP[j][3] 
            });
        }
    }
    
    return json(res);
}

// --- USERS ---
function listUsers() {
    var sheet = getSheet(SHEET_USERS);
    if (!sheet) return json({ ok: true, users: [] });
    var data = sheet.getDataRange().getValues();
    var users = [];
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (!row[0]) continue;
        users.push({
            id: row[0], email: row[0], displayName: row[1], role: row[2],
            region: row[3], managerEmail: row[4], password: row[5].toString(),
            active: row[6] === 1 || row[6] === "1" || row[6] === true
        });
    }
    return json({ ok: true, users: users });
}

function upsertUser(u) {
    var sheet = getSheet(SHEET_USERS);
    if (!sheet) return json({ ok: false, message: "Sheet missing: " + SHEET_USERS });
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
        if (data[i][0] == u.email) { rowIndex = i + 1; break; }
    }
    var rowData = [u.email, u.name, u.role, u.region, u.managerEmail, u.password, u.active === false ? 0 : 1];
    if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    else sheet.appendRow(rowData);
    return json({ ok: true, message: "User saved" });
}

function deleteUser(email) {
    var sheet = getSheet(SHEET_USERS);
    if (!sheet) return json({ ok: false, message: "Sheet missing: " + SHEET_USERS });
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
        if (data[i][0] == email) { sheet.deleteRow(i + 1); return json({ ok: true, message: "User deleted" }); }
    }
    return json({ ok: false, message: "User not found" });
}

// --- QUOTES & LINES ---
function saveQuote(payload) {
    var q = payload.quote;
    var lines = payload.rows;
    if (!q) return json({ ok: false, message: "Invalid quote data" });
    var sheetQuotes = getSheet(SHEET_QUOTES);
    if (!sheetQuotes) return json({ ok: false, message: "QUOTES sheet not found" });
    if (!q.id || q.id === "NEW" || q.id.indexOf("DRAFT-") === 0) {
        q.id = internal_getNextQuoteNo();
    }
    var data = sheetQuotes.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
        if (data[i][0] == q.id) { rowIndex = i + 1; break; }
    }
    var rowData = [
        q.id,
        q.createdAt || new Date().toISOString(),
        q.createdBy || "",
        q.role || "sales",
        q.region || "",
        q.ownerEmail || "",
        q.cari || "",
        q.validUntil || "",
        q.status || "DRAFT",
        q.totalTRY || 0,
        q.totalUSD || 0,
        q.terms || "",
        q.yetkili || ""
    ];
    if (rowIndex > 0) sheetQuotes.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    else sheetQuotes.appendRow(rowData);
    var sheetLines = getSheet(SHEET_QUOTE_LINES);
    if (sheetLines) {
        var dataLines = sheetLines.getDataRange().getValues();
        for (var i = dataLines.length - 1; i >= 1; i--) {
            if (dataLines[i][0] == q.id) sheetLines.deleteRow(i + 1);
        }
        var newRows = lines.map(function (r) {
            var net = (Number(r.listPrice) || 0) * (1 - (Number(r.discountPct) || 0) / 100) * (Number(r.qty) || 0);
            return [q.id, r.code, r.name || "", r.qty, r.currency, r.listPrice, r.discountPct, net, r.termin];
        });
        if (newRows.length > 0) {
            sheetLines.getRange(sheetLines.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
        }
    }
    return json({ ok: true, message: "Quote saved successfully", id: q.id });
}

function listQuotes() {
    var sheet = getSheet(SHEET_QUOTES);
    if (!sheet) return json({ ok: true, quotes: [] });
    var data = sheet.getDataRange().getValues();
    var quotes = [];
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (!row[0]) continue;
        quotes.push({
            id: row[0].toString(), createdAt: row[1], createdBy: row[2], role: row[3], region: row[4],
            ownerEmail: row[5], cari: row[6], validUntil: row[7], status: row[8],
            totalTRY: row[9] || 0, totalUSD: row[10] || 0, terms: row[11] || "", yetkili: row[12] || ""
        });
    }
    return json({ ok: true, quotes: quotes });
}

function getQuoteDetail(id) {
    if (!id) return json({ ok: false, message: "Missing ID" });
    var sheetQ = getSheet(SHEET_QUOTES);
    var sheetL = getSheet(SHEET_QUOTE_LINES);
    var quote = null;
    var rows = [];
    if (sheetQ) {
        var dataQ = sheetQ.getDataRange().getValues();
        for (var i = 1; i < dataQ.length; i++) {
            if (dataQ[i][0] == id) {
                quote = {
                    id: dataQ[i][0].toString(), createdAt: dataQ[i][1], createdBy: dataQ[i][2],
                    role: dataQ[i][3], region: dataQ[i][4], ownerEmail: dataQ[i][5], cari: dataQ[i][6],
                    validUntil: dataQ[i][7], status: dataQ[i][8], totalTRY: dataQ[i][9] || 0,
                    totalUSD: dataQ[i][10] || 0, terms: dataQ[i][11] || "", yetkili: dataQ[i][12] || ""
                };
                break;
            }
        }
    }
    if (!quote) return json({ ok: false, message: "Quote not found" });
    if (sheetL) {
        var dataL = sheetL.getDataRange().getValues();
        for (var j = 1; j < dataL.length; j++) {
            if (dataL[j][0] == id) {
                rows.push({
                    code: dataL[j][1], name: dataL[j][2], qty: dataL[j][3],
                    currency: dataL[j][4], listPrice: dataL[j][5], discountPct: dataL[j][6],
                    netPrice: dataL[j][7], termin: dataL[j][8]
                });
            }
        }
    }
    quote.rows = rows;
    return json({ ok: true, quote: quote });
}

function updateQuoteStatus(p) {
    var sheet = getSheet(SHEET_QUOTES);
    if (!sheet) return json({ ok: false, message: "QUOTES sheet not found" });
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
        if (data[i][0] == p.id) { sheet.getRange(i + 1, 9).setValue(p.status); return json({ ok: true, message: "Status updated" }); }
    }
    return json({ ok: false, message: "Quote not found" });
}

// --- SETTINGS (YAPILANDIRMA) ---
function getSettings() {
    var sheetConfig = getSheet("YAPILANDIRMA");
    if (!sheetConfig) return json({ ok: true, settings: {} });
    
    var data = sheetConfig.getDataRange().getValues();
    var settings = {};
    for(var i=0; i<data.length; i++) {
        var key = data[i][0];
        var val = data[i][1];
        settings[key] = val;
    }
    return json({ ok: true, settings: settings });
}

function saveSettings(data) {
    var sheet = getSheet("YAPILANDIRMA") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("YAPILANDIRMA");
    
    if(data.settings) {
        var existing = sheet.getDataRange().getValues();
        var map = {};
        for(var i=0; i<existing.length; i++) map[existing[i][0]] = i;
        
        for(var k in data.settings) {
            if(map[k] !== undefined) {
                sheet.getRange(map[k]+1, 2).setValue(data.settings[k]);
            } else {
                sheet.appendRow([k, data.settings[k]]);
                map[k] = sheet.getLastRow() - 1;
            }
        }
        return json({ ok: true, message: "Settings saved" });
    }
    
    return json({ ok: false, message: "Invalid data" });
}

function listTerms() {
    var sheet = getSheet(SHEET_TERMS);
    if (!sheet) return json({ ok: true, terms: [] });
    var data = sheet.getDataRange().getValues();
    var terms = [];
    for (var i = 1; i < data.length; i++) { if (data[i][0]) terms.push(data[i][0]); }
    return json({ ok: true, terms: terms });
}
function saveTerm(term) {
    if (!term) return json({ ok: false });
    var sheet = getSheet(SHEET_TERMS);
    if (!sheet) return json({ ok: false, message: "Sheet TEKLIF_SARTLARI missing" });
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) { if (data[i][0] == term) return json({ ok: true, message: "Exists" }); }
    sheet.appendRow([term]);
    return json({ ok: true, message: "Saved" });
}

// --- AGENDA / NOTES FUNCTIONS ---
function listAgenda(data) {
  var sheet = getSheet(SHEET_AGENDA);
  if (!sheet) return json({ ok: true, items: [] });
  
  var dataRows = sheet.getDataRange().getValues();
  if (dataRows.length < 2) return json({ ok: true, items: [] });

  var items = [];
  var headers = (dataRows[0] || []).map(function(h) { return String(h).trim().toLowerCase(); });
  
  // Robust Mapping with Fallbacks
  var colMap = {
    id: headers.indexOf("id") > -1 ? headers.indexOf("id") : 0,
    salesPointId: headers.indexOf("salespointid") > -1 ? headers.indexOf("salespointid") : 1,
    type: headers.indexOf("type") > -1 ? headers.indexOf("type") : 2,
    date: headers.indexOf("date") > -1 ? headers.indexOf("date") : 3,
    content: headers.indexOf("content") > -1 ? headers.indexOf("content") : 4,
    status: headers.indexOf("status") > -1 ? headers.indexOf("status") : 5,
    createdBy: headers.indexOf("createdby") > -1 ? headers.indexOf("createdby") : 6,
    createdAt: headers.indexOf("createdat") > -1 ? headers.indexOf("createdat") : 7,
    category: headers.indexOf("category") > -1 ? headers.indexOf("category") : 8
  };

  for (var i = 1; i < dataRows.length; i++) {
    var row = dataRows[i];
    if (!row[colMap.id] && !row[colMap.content]) continue; // Skip empty rows

    var item = {
      id: String(row[colMap.id] || ""),
      salesPointId: String(row[colMap.salesPointId] || ""),
      type: String(row[colMap.type] || "NOTE"),
      date: row[colMap.date] instanceof Date ? Utilities.formatDate(row[colMap.date], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(row[colMap.date] || ""),
      content: String(row[colMap.content] || ""),
      status: String(row[colMap.status] || "OPEN"),
      createdBy: String(row[colMap.createdBy] || ""),
      createdAt: row[colMap.createdAt] instanceof Date ? row[colMap.createdAt].toISOString() : String(row[colMap.createdAt] || ""),
      category: String(row[colMap.category] || "")
    };
    
    // Filter by User (Case-insensitive & Trimmed)
    if (data.email) {
      var searchEmail = String(data.email).trim().toLowerCase();
      var itemEmail = String(item.createdBy).trim().toLowerCase();
      if (itemEmail && itemEmail !== searchEmail) continue; 
    }
    
    items.push(item);
  }
  
  return json({ ok: true, items: items });
}

function saveAgendaItem(data) {
  var sheet = getSheet(SHEET_AGENDA);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_AGENDA);
    sheet.appendRow(["id", "salesPointId", "type", "date", "content", "status", "createdBy", "createdAt", "category"]);
  }
  
  var id = data.id || Utilities.getUuid();
  var dataRows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  
  for (var i = 1; i < dataRows.length; i++) {
    if (dataRows[i][0] == id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var rowData = [
    id,
    data.salesPointId || "",
    data.type || "NOTE",
    data.date || "",
    data.content || "",
    data.status || "OPEN",
    data.createdBy || "",
    data.createdAt || new Date().toISOString(),
    data.category || ""
  ];
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return json({ ok: true, message: "Agenda item saved", id: id });
}

function deleteAgendaItem(data) {
  var sheet = getSheet(SHEET_AGENDA);
  if (!sheet) return json({ ok: false, message: "Sheet not found" });
  
  var dataRows = sheet.getDataRange().getValues();
  for (var i = 1; i < dataRows.length; i++) {
    if (dataRows[i][0] == data.id) {
      sheet.deleteRow(i + 1);
      return json({ ok: true, message: "Agenda item deleted" });
    }
  }
  return json({ ok: false, message: "Item not found" });
}

// --- CORE ---
function getSheet(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }
function json(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
