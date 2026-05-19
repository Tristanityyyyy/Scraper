function scrapeGooglePlaces() {
  const results = [];

  function tryGet(fn) {
    try { return fn(); } catch { return ""; }
  }

  const sidebarNameMap = new Map();
  document.querySelectorAll('[data-record-click-time]').forEach((item) => {
    const fullName = item.querySelector('[role="heading"]')?.innerText?.trim();
    if (fullName) {
      const key = fullName.substring(0, 10).toLowerCase();
      sidebarNameMap.set(key, fullName);
    }
  });

  const cards = document.querySelectorAll('.rllt__details');

  cards.forEach((card) => {
    const text = card.innerText;

    const rawName = tryGet(() => card.querySelector('.OSrXXb')?.innerText?.trim()) || "—";
    const lookupKey = rawName.substring(0, 10).toLowerCase();
    const name = sidebarNameMap.get(lookupKey) || rawName;

    const rating = tryGet(() => text.match(/(\d\.\d)/)?.[1]) || "—";
    const reviews = tryGet(() => text.match(/\((\d+)\)/)?.[1]) || "—";
    const category = tryGet(() => text.match(/·\s*([A-Za-z\s]+?)(?:\n|·|$)/)?.[1]?.trim()) || "—";
    const distance = tryGet(() => { const m = text.match(/(\d+\.?\d*)\s*(km|m)\b/); return m ? `${m[1]} ${m[2]}` : "—"; });
    const phone = tryGet(() =>
      text.match(/\(0\d{2,3}\)\s?\d{3,4}\s?\d{4}/)?.[0] ||
      text.match(/0\d{3}\s?\d{3}\s?\d{4}/)?.[0]
    ) || "—";
    const hours = tryGet(() => text.match(/(Open|Closed|Closes|Opens)[^\n·]*/i)?.[0]?.trim()) || "—";
    const sponsored = card.closest('li')?.innerText?.includes('Sponsored') ? "Yes" : "No";
    const price = tryGet(() => text.match(/(₱[\d,]+[-–][\,]+|₱[\d,]+)/)?.[0]) || "—";

    // ✅ Address extraction
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const addressRaw = lines[2] || "—";
    const address = addressRaw
      .replace(/·?\s*\(0\d{2,3}\)\s?\d{3,4}\s?\d{4}.*/, "")
      .replace(/·?\s*0\d{3}\s?\d{3}\s?\d{4}.*/, "")
      .trim() || "—";

    // ✅ This was missing in your version!
    results.push({ name, rating, reviews, category, address, distance, phone, hours, price, sponsored });
  });

  // ✅ Dedup is outside forEach
  const seen = new Set();
  return results.filter((r) => {
    const key = r.name + r.address;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    const data = scrapeGooglePlaces();
    sendResponse({ success: true, data });
  }
  return true;
});