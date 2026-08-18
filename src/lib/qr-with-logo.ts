import QRCode from "qrcode";

export async function makeQr(url: string) {
  return QRCode.toDataURL(url, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#1a1514", light: "#fffdf8" },
  });
}
