# Online Kalender

Diese Kalender-App laeuft direkt im Browser und enthaelt:

- Wochenansicht mit Uhrzeiten von 07:00 bis 17:00
- Monatsansicht
- Jahresansicht
- Login mit Benutzername und Passwort
- Termin anlegen, bearbeiten und loeschen
- Termine ueber mehrere Tage
- Export und Import als JSON-Datei
- responsive Bedienung fuer PC, iPad und iPhone
- optionale Supabase-Synchronisierung fuer mehrere Geraete

## Lokal oeffnen

Die Datei `index.html` im gleichen Ordner kann direkt im Browser geoeffnet werden.

## Auf GitHub Pages hosten

1. Neues GitHub-Repository erstellen, zum Beispiel `online-kalender`.
2. Alle Dateien aus diesem Ordner in das Repository hochladen.
3. In GitHub unter `Settings` -> `Pages` die Quelle `Deploy from a branch`
   waehlen.
4. Branch `main` und Ordner `/root` auswaehlen.
5. Nach kurzer Zeit ist die Seite unter
   `https://DEIN-BENUTZERNAME.github.io/online-kalender/` erreichbar.

## Wichtig zur Synchronisierung

Ohne Supabase-Konfiguration speichert die App Termine lokal im jeweiligen
Browser. Sobald Supabase eingerichtet ist, werden Termine in der Tabelle
`calendar_events` gespeichert und nach dem Login auf PC, iPad und iPhone
synchronisiert.

GitHub Pages hostet HTML, CSS und JavaScript statisch. Die Datenbank und der
echte Login laufen deshalb ueber Supabase.

## Supabase einrichten

1. In Supabase ein neues Projekt erstellen.
2. In Supabase unter `SQL Editor` den Inhalt von `supabase/schema.sql`
   ausfuehren. Bei bestehenden Projekten das Schema erneut ausfuehren, damit
   die Spalte `end_date` fuer mehrtaegige Termine angelegt wird.
3. In Supabase unter `Authentication` -> `Users` einen Benutzer anlegen:
   - E-Mail: `axel@example.com` oder eine eigene echte E-Mail
   - Passwort: `416114`
4. Falls du eine andere E-Mail verwendest, in `supabase-config.js` den Eintrag
   `Axel` auf diese E-Mail setzen.
5. In Supabase unter `Project Settings` -> `API` diese Werte kopieren:
   - `Project URL`
   - `anon public` Key
6. Die Werte in `supabase-config.js` eintragen:

```js
window.KALENDER_SUPABASE_CONFIG = {
  url: "https://DEIN-PROJEKT.supabase.co",
  anonKey: "DEIN-ANON-PUBLIC-KEY",
  loginUsers: {
    Axel: "axel@example.com"
  }
};
```

Danach die geaenderte `supabase-config.js` nach GitHub pushen.

Optional fuer Sofort-Aktualisierung zwischen offenen Browserfenstern:
In Supabase Realtime fuer die Tabelle `calendar_events` aktivieren. Die App
laedt Termine aber auch beim Speichern und beim erneuten Fokussieren des
Browserfensters nach.

## Login-Hinweis

Wenn Supabase konfiguriert ist, prueft Supabase Auth das Passwort. Der
Frontend-Code enthaelt dann kein Passwort. Ohne Supabase-Konfiguration gibt es
weiterhin einen lokalen Fallback-Login fuer Tests.
