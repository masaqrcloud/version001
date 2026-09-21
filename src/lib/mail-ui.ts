/**
 * E-posta arayüz kiti.
 *
 * Grafikler tablo + arka plan rengiyle çizilir; Gmail ve Outlook SVG, harici
 * CSS ve JS çalıştırmadığı için başka yöntem güvenilir değil. Tüm stiller
 * satır içi (inline) yazılmalı.
 */

export const MAIL_COLORS = {
  bg: "#f8f1e8",
  card: "#fffdf9",
  ink: "#201a15",
  muted: "#756b62",
  line: "#ead9ca",
  accent: "#e84a36",
  accentSoft: "#fdece9",
  gold: "#e89b1a",
  ok: "#0f766e",
  okSoft: "#e6f6f1",
  bad: "#b3261e",
  badSoft: "#fdecea",
  warn: "#9a5b00",
  warnSoft: "#fff3d6",
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value: number) {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

export { money as mailMoney };

/** Gelen kutusunda konu satırının yanında görünen gri ön izleme metni. */
function preheaderBlock(text?: string) {
  if (!text) return "";
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(text)}</div>`;
}

export function mailDocument({
  title,
  kicker = "MasaQR",
  preheader,
  content,
  footer,
}: {
  title: string;
  kicker?: string;
  preheader?: string;
  content: string;
  footer?: string;
}) {
  const c = MAIL_COLORS;
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${c.bg};-webkit-font-smoothing:antialiased">
${preheaderBlock(preheader)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};padding:28px 12px">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${c.card};border:1px solid ${c.line};border-radius:20px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:${c.ink}">
        <tr><td style="height:8px;background:${c.accent};line-height:8px;font-size:0">&nbsp;</td></tr>
        <tr>
          <td style="padding:30px 30px 8px">
            <p style="margin:0;color:${c.accent};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${escapeHtml(kicker)}</p>
            <h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:29px;font-weight:500;line-height:1.2;color:${c.ink}">${escapeHtml(title)}</h1>
          </td>
        </tr>
        <tr><td style="padding:16px 30px 30px;font-size:15px;line-height:1.65;color:${c.ink}">${content}</td></tr>
        <tr>
          <td style="padding:20px 30px 26px;border-top:1px solid ${c.line};background:#fffaf4">
            <p style="margin:0;color:${c.muted};font-size:12px;line-height:1.6">
              ${footer ?? "Bu e-posta MasaQR tarafından gönderildi."}
            </p>
            <p style="margin:8px 0 0;color:${c.muted};font-size:12px">
              <a href="https://masaqr.net" style="color:${c.muted};text-decoration:underline">masaqr.net</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Eski çağrılarla uyumlu sarmalayıcı. */
export function brandedEmail(title: string, content: string) {
  return mailDocument({ title, content });
}

export function mailParagraph(text: string) {
  return `<p style="margin:0 0 14px">${text}</p>`;
}

export function mailSectionTitle(text: string) {
  return `<p style="margin:28px 0 10px;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${MAIL_COLORS.muted}">${escapeHtml(text)}</p>`;
}

export function mailButton(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0">
    <tr><td style="background:${MAIL_COLORS.ink};border-radius:999px">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;color:#fff;font-size:15px;font-weight:600;text-decoration:none">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

type Tone = "neutral" | "ok" | "bad" | "warn" | "accent";

const toneColors: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: "#f6efe7", fg: MAIL_COLORS.ink },
  ok: { bg: MAIL_COLORS.okSoft, fg: MAIL_COLORS.ok },
  bad: { bg: MAIL_COLORS.badSoft, fg: MAIL_COLORS.bad },
  warn: { bg: MAIL_COLORS.warnSoft, fg: MAIL_COLORS.warn },
  accent: { bg: MAIL_COLORS.accentSoft, fg: MAIL_COLORS.accent },
};

export function mailCallout(tone: Tone, html: string) {
  const { bg, fg } = toneColors[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0">
    <tr><td style="padding:14px 16px;background:${bg};border-radius:14px;color:${fg};font-size:14px;line-height:1.6">${html}</td></tr>
  </table>`;
}

/** Büyük vurgu kutusu: ikram, toplam tutar gibi tek bir değeri öne çıkarır. */
export function mailHero(label: string, value: string, note?: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
    <tr><td align="center" style="padding:22px 18px;background:${MAIL_COLORS.accent};border-radius:18px">
      <p style="margin:0;color:#ffd9cf;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${escapeHtml(label)}</p>
      <p style="margin:8px 0 0;color:#fff;font-family:Georgia,serif;font-size:26px;line-height:1.25">${escapeHtml(value)}</p>
      ${note ? `<p style="margin:8px 0 0;color:#ffe3db;font-size:13px">${escapeHtml(note)}</p>` : ""}
    </td></tr>
  </table>`;
}

export type Kpi = { label: string; value: string; delta?: number | null };

function deltaChip(delta: number) {
  const up = delta >= 0;
  const color = up ? MAIL_COLORS.ok : MAIL_COLORS.bad;
  const bg = up ? MAIL_COLORS.okSoft : MAIL_COLORS.badSoft;
  const sign = up ? "▲" : "▼";
  return `<span style="display:inline-block;margin-top:6px;padding:2px 8px;background:${bg};border-radius:999px;color:${color};font-size:11px;font-weight:700">${sign} %${Math.abs(Math.round(delta))}</span>`;
}

/** İki kolonlu KPI kartları. */
export function mailKpiGrid(items: Kpi[]) {
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const pair = [items[i], items[i + 1]];
    rows.push(
      `<tr>${pair
        .map((item) =>
          item
            ? `<td width="50%" valign="top" style="padding:6px">
                 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf4;border:1px solid ${MAIL_COLORS.line};border-radius:14px">
                   <tr><td style="padding:14px 16px">
                     <p style="margin:0;color:${MAIL_COLORS.muted};font-size:12px">${escapeHtml(item.label)}</p>
                     <p style="margin:5px 0 0;font-size:21px;font-weight:700;line-height:1.2">${escapeHtml(item.value)}</p>
                     ${item.delta === null || item.delta === undefined ? "" : deltaChip(item.delta)}
                   </td></tr>
                 </table>
               </td>`
            : `<td width="50%">&nbsp;</td>`,
        )
        .join("")}</tr>`,
    );
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0">${rows.join("")}</table>`;
}

/** Yatay çubuk grafik: en çok satanlar gibi sıralı listeler için. */
export function mailBarChart(
  rows: { label: string; value: number; display: string }[],
  color = MAIL_COLORS.accent,
) {
  if (!rows.length) return "";
  const max = Math.max(...rows.map((row) => row.value), 1);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${rows
      .map((row) => {
        const pct = Math.max(3, Math.round((row.value / max) * 100));
        return `<tr>
          <td style="padding:7px 0 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:14px;color:${MAIL_COLORS.ink}">${escapeHtml(row.label)}</td>
                <td align="right" style="font-size:13px;font-weight:700;color:${MAIL_COLORS.muted};white-space:nowrap">${escapeHtml(row.display)}</td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:5px;background:#f2e7db;border-radius:999px">
              <tr>
                <td width="${pct}%" style="height:9px;line-height:9px;font-size:0;background:${color};border-radius:999px">&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>`;
      })
      .join("")}
  </table>`;
}

/** Dikey kolon grafik: son 7 günün cirosu gibi zaman serileri için. */
export function mailColumnChart(
  columns: { label: string; value: number; display?: string }[],
  options?: { height?: number; color?: string; highlightLast?: boolean },
) {
  if (!columns.length) return "";
  const height = options?.height ?? 92;
  const color = options?.color ?? MAIL_COLORS.accent;
  const max = Math.max(...columns.map((column) => column.value), 1);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;background:#fffaf4;border:1px solid ${MAIL_COLORS.line};border-radius:16px">
    <tr><td style="padding:16px 14px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${columns
            .map((column, index) => {
              const last =
                options?.highlightLast && index === columns.length - 1;
              const barHeight = Math.max(
                4,
                Math.round((column.value / max) * height),
              );
              return `<td valign="bottom" align="center" style="padding:0 3px">
                <div style="height:${height - barHeight}px;line-height:1px;font-size:0">&nbsp;</div>
                <div style="height:${barHeight}px;background:${last ? color : "#f0c9bd"};border-radius:6px 6px 0 0;font-size:0;line-height:${barHeight}px">&nbsp;</div>
              </td>`;
            })
            .join("")}
        </tr>
        <tr>
          ${columns
            .map(
              (column) =>
                `<td align="center" style="padding:7px 2px 0;font-size:11px;color:${MAIL_COLORS.muted};white-space:nowrap">${escapeHtml(column.label)}</td>`,
            )
            .join("")}
        </tr>
        ${
          columns.some((column) => column.display)
            ? `<tr>${columns
                .map(
                  (column) =>
                    `<td align="center" style="padding:2px 2px 0;font-size:10px;color:${MAIL_COLORS.ink};white-space:nowrap">${escapeHtml(column.display ?? "")}</td>`,
                )
                .join("")}</tr>`
            : ""
        }
      </table>
    </td></tr>
  </table>`;
}

/** Müdavim kartı: dolu/boş daireler. */
export function mailPunchCard(filled: number, total: number) {
  const cells: string[] = [];
  for (let i = 0; i < total; i += 1) {
    const on = i < filled;
    cells.push(
      `<td align="center" style="padding:3px">
         <table role="presentation" cellpadding="0" cellspacing="0" style="width:30px;height:30px;border-radius:999px;background:${on ? MAIL_COLORS.accent : "#f4e6d9"};border:1px solid ${on ? MAIL_COLORS.accent : MAIL_COLORS.line}">
           <tr><td align="center" style="font-size:12px;font-weight:700;color:${on ? "#fff" : MAIL_COLORS.muted};line-height:28px">${on ? "★" : i + 1}</td></tr>
         </table>
       </td>`,
    );
  }
  const half = Math.ceil(total / 2);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
    <tr><td align="center" style="padding:14px 8px;background:#fffaf4;border:1px solid ${MAIL_COLORS.line};border-radius:16px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>${cells.slice(0, half).join("")}</tr></table>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:4px"><tr>${cells.slice(half).join("")}</tr></table>
      <p style="margin:12px 0 0;font-size:13px;color:${MAIL_COLORS.muted}">${filled} / ${total} damga</p>
    </td></tr>
  </table>`;
}

/** Adisyon/sipariş satırları tablosu. */
export function mailLineTable(
  rows: { label: string; amount: string; note?: string }[],
  total?: { label: string; amount: string },
) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0">
    ${rows
      .map(
        (row) => `<tr>
          <td style="padding:10px 0;border-bottom:1px solid ${MAIL_COLORS.line};font-size:14px">
            ${escapeHtml(row.label)}
            ${row.note ? `<span style="display:block;color:${MAIL_COLORS.muted};font-size:12px">${escapeHtml(row.note)}</span>` : ""}
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid ${MAIL_COLORS.line};font-size:14px;white-space:nowrap">${escapeHtml(row.amount)}</td>
        </tr>`,
      )
      .join("")}
    ${
      total
        ? `<tr>
             <td style="padding:14px 0 0;font-size:16px;font-weight:700">${escapeHtml(total.label)}</td>
             <td align="right" style="padding:14px 0 0;font-size:18px;font-weight:700;white-space:nowrap">${escapeHtml(total.amount)}</td>
           </tr>`
        : ""
    }
  </table>`;
}

/** Madde listesi: hoş geldin maili gibi tanıtım bölümleri için. */
export function mailFeatureList(items: { title: string; text: string }[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0">
    ${items
      .map(
        (item) => `<tr>
          <td style="padding:9px 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="26" valign="top" style="padding-top:2px;color:${MAIL_COLORS.accent};font-size:15px;font-weight:700">●</td>
                <td style="font-size:14px;line-height:1.6">
                  <strong>${escapeHtml(item.title)}</strong><br>
                  <span style="color:${MAIL_COLORS.muted}">${escapeHtml(item.text)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`,
      )
      .join("")}
  </table>`;
}
