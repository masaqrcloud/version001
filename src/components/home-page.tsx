import { AppShell } from "@/components/app-shell";
import { HomeContactForm } from "@/components/home-contact-form";
import {
  HomeFeatureIcon,
  type IconName,
} from "@/components/home-feature-icon";
import { HomeGuestDemo } from "@/components/home-guest-demo";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const steps = [
  {
    n: "01",
    title: "Masadaki kod okutulur",
    body: "Misafir, kamera ile QR kodu tarar. Uygulama indirmeden menü saniyeler içinde açılır.",
    image: "/home/scan-qr.png",
    alt: "Masada QR kod tarayan telefon",
  },
  {
    n: "02",
    title: "Sipariş telefondan iletilir",
    body: "Her misafir kendi sepetini oluşturur. Alerjen bilgisi, kalori ve ürün seçenekleri ilgili kalemin yanında yer alır.",
    image: "/home/phone-menu.png",
    alt: "Telefonda açık dijital menü",
  },
  {
    n: "03",
    title: "Mutfak ve servis aynı anda görür",
    body: "Sipariş mutfak ekranına düşer. Garson masa durumunu ve adisyonu takip eder; hazırlık tamamlandığında misafir bilgilendirilir.",
    image: "/home/kitchen.png",
    alt: "Mutfak tezgâhında sipariş ekranı",
  },
];

const references = [
  { label: "Kafe", image: "/home/tea-coffee.png", alt: "Çay ve kahve ikramı" },
  { label: "Balıkçı", image: "/home/seafood.png", alt: "Izgara balık tabağı" },
  {
    label: "Otel restoranı",
    image: "/home/hotel.png",
    alt: "Otel restoranı masası",
  },
  {
    label: "Pastane",
    image: "/home/pastry.png",
    alt: "Pastane tatlıları ve Türk kahvesi",
  },
];

const reasons: {
  title: string;
  body: string;
  icon: IconName;
}[] = [
  {
    title: "1 Temmuz menü yönetmeliğine uyum",
    body: "14 alerjen, et kaynağı, alkol ve domuz bilgisi ile porsiyon kalorisi yönetim panelinden girilir, menüde anında yayınlanır.",
    icon: "allergen",
  },
  {
    title: "Baskı maliyeti ortadan kalkar",
    body: "Fiyat veya ürün değişikliğinde menüyü yeniden bastırmanız gerekmez. QR kod aynı kalır, içerik güncellenir.",
    icon: "print",
  },
  {
    title: "Anlık güncelleme",
    body: "Tükendi işareti, yeni ürün veya kampanya fiyatı kaydedildiği anda masadaki ekranda görünür.",
    icon: "bolt",
  },
  {
    title: "Hijyenik sunum",
    body: "Misafir menüye kendi telefonundan ulaşır. Ortak basılı menü dolaşmaz, temas azalır.",
    icon: "hygiene",
  },
  {
    title: "Mutfak ve garson ekranları",
    body: "Sipariş, çağrı, masa durumu ve adisyon tek panelde toplanır. Garson, QR olmadan da masaya sipariş yazabilir.",
    icon: "screens",
  },
  {
    title: "Salon planı",
    body: "Kat yerleşimi canlı izlenir. Dolu masalar boş görünmez; servis ekibi boş masaya sipariş başlatabilir.",
    icon: "floor",
  },
  {
    title: "Stok takibi",
    body: "Siparişle stok adedi düşer; tükenecek ürün menüde otomatik işaretlenir. İsteğe bağlı aylık modül olarak sunulur.",
    icon: "stock",
  },
  {
    title: "Misafir ağı",
    body: "Kablosuz ağ adı ve şifresi masa ekranında gösterilir. Şifre, dokunulduğunda panoya kopyalanır.",
    icon: "wifi",
  },
];

const guestChips: { label: string; icon: IconName }[] = [
  { label: "QR ile giriş", icon: "qr" },
  { label: "Alerjen & kalori", icon: "allergen" },
  { label: "Kendi sepeti", icon: "cart" },
];

const EXTRA_TABLE_TRY = 89;
const EXTRA_VENUE_TRY = 1490;

const packages = [
  {
    name: "Menü",
    tag: "Başlangıç",
    price: "1.490",
    tables: 20,
    featured: false,
    summary: "Basılı menüyü dijitalleştirmek isteyen tek şubeli işletmeler için.",
    items: [
      "1 işletme",
      "20 masa dahil",
      "Dijital menü, sınırsız ürün",
      "Alerjen, kalori ve et kaynağı",
      "Anlık fiyat ve tükendi yönetimi",
      "Misafir ağı bilgisi",
      "Yönetim paneli",
    ],
  },
  {
    name: "Sipariş",
    tag: "En çok tercih edilen",
    price: "2.990",
    tables: 40,
    featured: true,
    summary: "Masadan mutfağa uzanan sipariş sürecini tek panelden yönetmek isteyen işletmeler için.",
    items: [
      "Menü paketindeki tüm özellikler",
      "40 masa dahil",
      "Masadan sipariş ve sepet",
      "Mutfak ve garson ekranları",
      "Adisyon, çağrı ve salon planı",
      "Sipariş geçmişi ve gün sonu özeti",
      "Personel rolleri",
    ],
  },
  {
    name: "Zincir",
    tag: "Çoklu işletme",
    price: "5.490",
    tables: 100,
    featured: false,
    summary: "Birden fazla şubeyi merkezi olarak yöneten işletmeler için.",
    items: [
      "Sipariş paketindeki tüm özellikler",
      "3 işletme dahil",
      "100 masa dahil (şubeler toplamı)",
      "Şubeler arası geçiş",
      "Rezervasyon ve stok modülleri dahil",
      "Merkezi menü ve raporlama",
      `Ek işletme ${EXTRA_VENUE_TRY.toLocaleString("tr-TR")} ₺/ay`,
    ],
  },
];

const modules: {
  name: string;
  price: string;
  screens: string;
  summary: string;
  icon: IconName;
}[] = [
  {
    name: "Rezervasyon",
    price: "590",
    screens: "Misafir rezervasyon sayfası · Yönetim / Rezervasyonlar",
    summary:
      "Tarih, saat ve masa seçimi alınır; onay bilgisi e-posta ile iletilir. Menü veya Sipariş paketine eklenebilir. Zincir paketinde dahildir.",
    icon: "floor",
  },
  {
    name: "Stok",
    price: "390",
    screens: "Yönetim / Stok",
    summary:
      "Siparişle stok adedi düşer, iptalde iade edilir. Teslimat, fire ve sayım aynı ekrandan yürütülür. Zincir paketinde dahildir.",
    icon: "stock",
  },
];

const bundledScreens = [
  {
    group: "Tüm paketlerde yer alır",
    items: [
      "Misafir dijital menü",
      "Yönetim / Menü",
      "Yönetim / Masalar ve QR kodlar",
      "Yönetim / Ayarlar (logo, kablosuz ağ, konum)",
      "Yönetim / Personel",
    ],
  },
  {
    group: "Sipariş ve Zincir paketlerine dahildir",
    items: [
      "Misafir sepeti ve sipariş",
      "Garson ekranı",
      "Mutfak ekranı",
      "Salon planı",
      "Sipariş geçmişi ve gün sonu",
    ],
  },
];

export function HomePage() {
  return (
    <AppShell
      nav={
        <>
          <a href="#nasil" className="nav-chip hidden sm:inline-flex">
            Nasıl çalışır
          </a>
          <a href="#ozellikler" className="nav-chip hidden sm:inline-flex">
            Özellikler
          </a>
          <a href="#paketler" className="nav-chip hidden sm:inline-flex">
            Paketler
          </a>
          <a href="#moduller" className="nav-chip hidden md:inline-flex">
            Modüller
          </a>
          <a href="#iletisim" className="nav-chip hidden md:inline-flex">
            İletişim
          </a>
          <ButtonLink href="/reservation" variant="ghost" size="sm">
            Rezervasyon
          </ButtonLink>
          <ButtonLink href="/apply" variant="ghost" size="sm">
            Başvuru
          </ButtonLink>
          <ButtonLink href="/mekan-giris" variant="outline" size="sm">
            Mekân girişi
          </ButtonLink>
          <ButtonLink href="/login" variant="secondary" size="sm">
            Giriş yap
          </ButtonLink>
        </>
      }
    >
      <section className="grid items-center gap-8 pt-4 lg:grid-cols-[1.05fr_0.95fr] lg:pt-6">
        <div className="home-rise flex flex-col justify-center">
          <p className="page-kicker">Kafe ve restoran işletmeleri</p>
          <h1 className="page-title max-w-2xl text-5xl sm:text-6xl">
            Misafirlerinize modern bir menü deneyimi sunun.
          </h1>
          <p className="page-lead text-lg">
            MasaQR; dijital menü, masa siparişi ve salon yönetimini tek
            platformda birleştirir. Misafirler uygulama indirmeden menüye
            ulaşır, mutfak ve servis ekipleri siparişleri anlık görüntüler.
            1 Temmuz menü yönetmeliğine uygun alerjen ve kalori bilgisi yayına
            hazırdır.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="#paketler" size="lg">
              Paketleri inceleyin
            </ButtonLink>
            <ButtonLink href="#nasil" variant="outline" size="lg">
              Nasıl çalışır?
            </ButtonLink>
            <ButtonLink href="/apply" variant="ghost" size="lg">
              Başvuru
            </ButtonLink>
          </div>
        </div>

        <div className="home-rise home-rise-2 home-hero-stage">
          <div className="home-hero-glow" aria-hidden />
          <div className="home-hero-phone">
            <HomeGuestDemo />
          </div>
        </div>
      </section>

      <section id="nasil" className="home-anchor mt-16">
        <p className="page-kicker">Nasıl çalışır?</p>
        <h2 className="page-title">Net arayüz, kontrollü operasyon</h2>
        <p className="page-lead">
          Misafir tarafında sade bir menü deneyimi; işletme tarafında mutfak
          ve salonun aynı anda izlenebildiği düzenli bir akış. Yukarıdaki
          telefon, QR kodu okutulmuş bir masanın çalışan örneğidir.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card
              key={step.title}
              className={`home-step-card home-rise ${index === 1 ? "home-rise-2" : index === 2 ? "home-rise-3" : ""}`}
            >
              <div className="home-media">
                <img src={step.image} alt={step.alt} loading="lazy" />
              </div>
              <div className="home-step-body">
                <p className="text-sm font-semibold text-[var(--accent)]">
                  {step.n}
                </p>
                <p className="mt-2 font-serif text-2xl">{step.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  {step.body}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section id="ozellikler" className="home-anchor mt-16">
        <p className="page-kicker">Neden MasaQR?</p>
        <h2 className="page-title home-title-wide">
          Menüden mutfağa, salondan kasaya — hepsi tek platformda
        </h2>
        <p className="page-lead">
          Yalnızca dijital bir menü değil; sipariş, stok, rezervasyon ve yasal
          bildirim yükümlülükleri aynı sistemde yönetilir.
        </p>
        <div className="home-feature-band">
          <div className="home-feature-copy">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                Misafir deneyimi
              </p>
              <p className="mt-2 font-serif text-3xl leading-snug text-[var(--ink)]">
                Menü cebinde, sipariş masada.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                Uygulama indirmeden QR ile giriş, alerjen ve kalori bilgisi,
                kendi sepeti. Ortak basılı menü dolaşmaz; herkes kendi
                telefonundan ilerler.
              </p>
              <div className="home-feature-chips">
                {guestChips.map((chip) => (
                  <span key={chip.label} className="home-feature-chip">
                    <HomeFeatureIcon name={chip.icon} />
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="home-media home-feature-inset">
              <img
                src="/home/feature-guest-phone.png"
                alt="Misafir telefonundan menüye bakıyor"
                loading="lazy"
              />
            </div>
          </div>
          <div className="home-media home-feature-photo">
            <img
              src="/home/feature-cafe-table.png"
              alt="Kafe masasında dijital menü ve ikram"
              loading="lazy"
            />
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason) => (
            <Card key={reason.title} className="home-reason-card">
              <HomeFeatureIcon name={reason.icon} />
              <p className="font-serif text-xl leading-snug text-[var(--ink)]">
                {reason.title}
              </p>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                {reason.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section id="paketler" className="home-anchor mt-16">
        <p className="page-kicker">Aylık paketler</p>
        <h2 className="page-title">İşletmenize uygun paketi seçin</h2>
        <p className="page-lead">
          Üç aylık plan sunulur. Sipariş paketi, masadan mutfağa uzanan tam
          operasyon sürecini kapsar. Her planda masa kotası bulunur; kota
          üzerindeki masalar aylık ek ücretle açılır. 14 günlük deneme
          süresinde kredi kartı istenmez.
        </p>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {packages.map((pack) => (
            <Card
              key={pack.name}
              className={`flex flex-col p-6 ${
                pack.featured
                  ? "border-[var(--accent)] shadow-[0_16px_40px_rgba(226,59,44,0.12)]"
                  : ""
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                {pack.tag}
              </p>
              <p className="mt-2 font-serif text-3xl text-[var(--ink)]">{pack.name}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{pack.summary}</p>
              <p className="mt-4 font-serif text-4xl tracking-tight text-[var(--ink)]">
                {pack.price} ₺
                <span className="ml-1 text-base font-sans font-medium text-[var(--muted)]">
                  / ay
                </span>
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {pack.tables} masa dahil
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-[var(--ink)]">
                {pack.items.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
              <ButtonLink
                href={`/apply?paket=${encodeURIComponent(pack.name.toLowerCase())}`}
                variant={pack.featured ? "primary" : "outline"}
                className="mt-6 self-start"
              >
                Paketi seçin
              </ButtonLink>
            </Card>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <p className="font-serif text-xl">Ek masa</p>
            <p className="mt-1 text-2xl font-semibold">
              {EXTRA_TABLE_TRY} ₺
              <span className="ml-1 text-sm font-medium text-[var(--muted)]">
                / masa / ay
              </span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Paket kotası dolduğunda her ek masa bu tutarla faturalandırılır.
              Kota ilgili ay için geçerlidir; masa kaldırıldığında ek ücret
              düşer.
            </p>
          </Card>
          <Card className="p-5">
            <p className="font-serif text-xl">Deneme</p>
            <p className="mt-1 text-2xl font-semibold">14 gün</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Sipariş paketi, 20 masa ile 14 gün boyunca ücretsiz
              kullanılabilir. Süre sonunda hizmet, seçilen aylık paketle
              devam eder.
            </p>
          </Card>
        </div>
      </section>

      <section id="moduller" className="home-anchor mt-16">
        <p className="page-kicker">Ek modüller</p>
        <h2 className="page-title">İhtiyacınıza göre genişletin</h2>
        <p className="page-lead">
          Mutfak ve garson ekranları sipariş sürecinin parçasıdır; ayrı
          satılmaz. Rezervasyon ve stok, bağımsız olarak eklenebilen aylık
          modüllerdir. Zincir paketinde her iki modül dahildir.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {modules.map((mod) => (
            <Card key={mod.name} className="flex flex-col p-6">
              <HomeFeatureIcon name={mod.icon} />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                Aylık ek
              </p>
              <p className="mt-2 font-serif text-3xl text-[var(--ink)]">{mod.name}</p>
              <p className="mt-3 font-serif text-4xl tracking-tight text-[var(--ink)]">
                {mod.price} ₺
                <span className="ml-1 text-base font-sans font-medium text-[var(--muted)]">
                  / ay
                </span>
              </p>
              <p className="mt-2 text-xs font-medium text-[var(--ink)]">
                {mod.screens}
              </p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">
                {mod.summary}
              </p>
              <ButtonLink
                href="/apply?paket=modul"
                variant="outline"
                className="mt-6 self-start"
              >
                Modülü ekleyin
              </ButtonLink>
            </Card>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {bundledScreens.map((bundle) => (
            <Card key={bundle.group} className="p-6">
              <p className="font-serif text-xl">{bundle.group}</p>
              <ul className="mt-3 space-y-2 text-sm text-[var(--ink)]">
                {bundle.items.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <Card className="overflow-hidden p-0">
          <div className="grid lg:grid-cols-2">
            <div className="relative min-h-64 overflow-hidden bg-[var(--ink)] p-8 text-[var(--bg)] sm:min-h-full sm:p-10">
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">
                  Referanslar
                </p>
                <p className="mt-3 font-serif text-3xl">Referans işletmeler</p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--bg)]/75">
                  MasaQR kullanan işletmelerin menü ve salon görünümleri bu
                  bölümde yayınlanacaktır.
                </p>
              </div>
            </div>
            <div className="grid gap-3 p-6 sm:grid-cols-2">
              {references.map((item) => (
                <div key={item.label} className="home-ref-tile">
                  <img src={item.image} alt={item.alt} loading="lazy" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section id="iletisim" className="home-anchor mt-16">
        <div className="grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="page-kicker">İletişim</p>
            <h2 className="page-title">İşletmeniz için doğru çözümü planlayalım</h2>
            <p className="page-lead">
              Başvurunuz yönetim paneline ve e-posta adresimize iletilir. En
              kısa sürede sizinle iletişime geçeriz.
            </p>
            <div className="home-media mt-6 aspect-[5/3]">
              <img
                src="/home/coffee-pour.png"
                alt="Taze demlenen kahve"
                loading="lazy"
              />
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <p className="rounded-2xl border border-[var(--line)] bg-surface/60 px-4 py-3">
                E-posta
                <a
                  className="mt-1 block font-medium text-[var(--ink)]"
                  href="mailto:masaqr.cloud@gmail.com"
                >
                  masaqr.cloud@gmail.com
                </a>
              </p>
              <p className="rounded-2xl border border-[var(--line)] bg-surface/60 px-4 py-3">
                Telefon
                <span className="mt-1 block font-medium text-[var(--muted)]">
                  Yakında duyurulacaktır
                </span>
              </p>
              <p className="rounded-2xl border border-[var(--line)] bg-surface/60 px-4 py-3">
                Ofis
                <span className="mt-1 block font-medium text-[var(--muted)]">
                  Türkiye
                </span>
              </p>
            </div>
          </div>
          <Card className="overflow-hidden p-0">
            <div className="h-2 bg-[var(--accent)]" />
            <div className="p-6 sm:p-8">
              <p className="font-serif text-2xl">İletişim formu</p>
              <p className="mb-6 mt-1 text-sm text-[var(--muted)]">
                Form, başvuru kaydına işlenir. Yanıtlama süresi genellikle bir
                iş günüdür.
              </p>
              <HomeContactForm />
            </div>
          </Card>
        </div>
      </section>

      <footer className="mt-16 border-t border-[var(--line)] pt-6 text-sm text-[var(--muted)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} MasaQR. Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap gap-4">
            <a href="#moduller">Modüller</a>
            <a href="#paketler">Paketler</a>
            <a href="/apply">Başvuru</a>
            <a href="/login">Giriş yap</a>
            <a href="/mekan-giris">Mekân girişi</a>
          </div>
        </div>
      </footer>
    </AppShell>
  );
}
