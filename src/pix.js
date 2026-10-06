export function normalizePixKey(value) {
  const key = String(value || "").trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return key;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return key;
  if (/^\+55\d{10,11}$/.test(key)) return key;
  return /^\d{11}(?:\d{3})?$/.test(key) ? key : null;
}

function crc16(value) {
  let crc = 0xffff;
  for (const char of value) {
    crc ^= char.charCodeAt(0) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function field(id, value) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

export function buildPixPayload({ key, merchantName, merchantCity, amountCents }) {
  const pixKey = normalizePixKey(key);
  if (!pixKey || !Number.isSafeInteger(amountCents) || amountCents <= 0) return null;
  const name = String(merchantName || "DOUTOR BURGER")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 25);
  const city = String(merchantCity || "JOAO PESSOA")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 15);
  const account = field("00", "BR.GOV.BCB.PIX") + field("01", pixKey);
  const amount = `${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, "0")}`;
  const body = field("00", "01") + field("26", account) + field("52", "0000")
    + field("53", "986") + field("54", amount) + field("58", "BR")
    + field("59", name) + field("60", city) + field("62", field("05", "***")) + "6304";
  return body + crc16(body);
}
