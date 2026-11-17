// 活動資訊與 Google Sheets 網址設定
window.APP_CONFIG = {
  EVENT_DATE: "尚未確定",
  EVENT_LOCATION: "尚未確定",
  EVENT_ASSEMBLY: "集合資訊待公布",
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzx9-4v2HvQXsvcImR9EIQHEcmKsUv4cFNE2qb-ry98MCwINZJvcvLj9QNghDjdXSSz/exec"
};
document.addEventListener("DOMContentLoaded", () => {
  const c = window.APP_CONFIG;
  document.getElementById("eventDate").textContent = c.EVENT_DATE;
  document.getElementById("eventLocation").textContent = c.EVENT_LOCATION;
  document.getElementById("eventAssembly").textContent = c.EVENT_ASSEMBLY;
});
