# Logo & Icons — So gibst du mir deine Dateien

Damit ich Logo und Icons **überall richtig** einbauen kann, mach bitte Folgendes:

---

## 1. Wo die Dateien hin müssen

**Alle Logo- und Icon-Dateien** legst du in diesen Ordner:

```
chairmatch/public/icons/
```

(Das ist der Ordner **public** im Projekt, darin der Unterordner **icons**.)

- Die **Next-App** (Hauptseite, Konto, Onboarding, etc.) lädt Bilder von hier unter `/icons/...`.
- Wenn du die **gleichen Dateinamen** wie unten nutzt, werden sie automatisch überall angezeigt.

---

## 2. Diese Dateinamen solltest du nutzen

Damit nichts kaputtgeht, benenne deine Dateien **genau so** (Groß-/Kleinschreibung beachten):

### Logo (2 Dateien)

| Dein Bild | Dateiname | Verwendung |
|-----------|-----------|------------|
| Nur Symbol (quadratisch, z. B. 512×512) | **logo_symbol_512x512.png** | Header, kleines Logo in der Nav |
| Logo mit Schriftzug (breit, z. B. 512×384) | **logo_lockup_512x384.png** | Onboarding, Registrierung, große Logo-Anzeige |

### Kategorie-Icons (für Startseite / Kategorien)

| Kategorie | Dateiname |
|-----------|-----------|
| Barbershop | **01_barbershop_256x384.png** |
| Friseur | **02_friseur_256x384.png** |
| Kosmetik | **03_kosmetik_256x384.png** |
| Ästhetik | **04_aesthetik_256x384.png** |
| Nagelstudio | **05_nagelstudio_256x384.png** |
| Massage | **06_massage_256x384.png** |
| Lash & Brows | **07_lash_brows_256x384.png** |
| Arzt / Klinik | **08_arzt_klinik_256x384.png** |
| OP-Raum | **09_op_raum_512x384.png** |
| Angebote | **10_angebote_256x384.png** |
| Termin | **11_termin_256x384.png** |
| Stuhlvermietung | **12_stuhlvermietung_512x384.png** |

### Empfohlene Größen (müssen nicht exakt sein)

- **logo_symbol:** quadratisch, z. B. 512×512 px (wird klein dargestellt).
- **logo_lockup:** z. B. 512×384 px (breiter als hoch).
- **Kategorien 01–10, 12:** z. B. 256×384 px (hochkant); OP-Raum & Stuhlvermietung: 512×384 px.

Du kannst auch andere Auflösungen verwenden – die App skaliert. Wichtig ist der **Dateiname**.

---

## 3. Ablauf: So änderst du alles „richtig“

1. **Dateien vorbereiten**  
   Dein Logo und deine Icons mit den **obigen Dateinamen** speichern.

2. **In den Ordner legen**  
   Alle Dateien nach `public/icons/` kopieren (alte Dateien mit gleichem Namen ersetzen).

3. **Mir Bescheid sagen**  
   Schreib z. B.:  
   *„Ich habe neue Logo und Icons in public/icons/ reingelegt.“*  
   Dann kann ich:
   - prüfen, ob alle Stellen im Code die richtigen Pfade nutzen (Next + Legacy),
   - falls du **andere Dateinamen** gewählt hast, die Pfade im Code anpassen,
   - die **Legacy-Version** (`index_legacy.html`) auf die gleichen Dateien ausrichten (z. B. Pfad `/icons/` oder Kopie der Icons).

---

## 4. Wenn du andere Dateinamen willst

Wenn deine Dateien z. B. `mein-logo.png` oder `barber-v2.png` heißen, ist das kein Problem. Sag mir dann:

- **Alter Dateiname** → **Neuer Dateiname** (z. B. für jede Kategorie und für Logo Symbol + Lockup).

Dann passe ich im Projekt **alle Vorkommen** an (Next-App + Legacy), damit überall deine neuen Dateien geladen werden.

---

## 5. Kurzüberblick: Wo was genutzt wird

| Wo | Was |
|----|-----|
| **Next-App** | `src/components/HomeClient.tsx`, `OnboardingGate.tsx`, `account/page.tsx`, `Logo.tsx`, `register/anbieter/page.tsx`, `constants.ts` |
| **Legacy** | `index_legacy.html` (Logo, Kategorien, Onboarding, Vermietung) |

Wenn du die Dateien in **public/icons/** mit den **richtigen Namen** ablegst und mir Bescheid gibst, kann ich alles so anpassen, dass überall dein Logo und deine Icons erscheinen – **richtig und einheitlich**.
