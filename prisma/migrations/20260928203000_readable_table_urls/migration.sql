-- Masa adresleri okunabilir olsun: {mekan-slug}-masa-{numara}. Eski adres basılı QR'lar için saklanır.
ALTER TABLE "Table" ADD COLUMN "legacyQrToken" TEXT;

CREATE UNIQUE INDEX "Table_legacyQrToken_key" ON "Table"("legacyQrToken");

UPDATE "Table"
SET
  "legacyQrToken" = "qrToken",
  "qrToken" = (SELECT "slug" FROM "Venue" WHERE "Venue"."id" = "Table"."venueId") || '-' ||
    CASE
      WHEN trim("number") <> '' AND trim("number") NOT GLOB '*[^0-9]*'
        THEN 'masa-' || trim("number")
      ELSE lower(
        replace(replace(replace(replace(replace(replace(replace(
        replace(replace(replace(replace(replace(replace(
          trim("number"),
          ' ', '-'),
          'Ç', 'c'), 'ç', 'c'),
          'Ğ', 'g'), 'ğ', 'g'),
          'İ', 'i'), 'ı', 'i'),
          'Ö', 'o'), 'ö', 'o'),
          'Ş', 's'), 'ş', 's'),
          'Ü', 'u'), 'ü', 'u')
      )
    END;
