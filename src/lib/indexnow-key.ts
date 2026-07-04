/**
 * IndexNow-Key (Fallback, wenn ENV INDEXNOW_KEY nicht gesetzt ist).
 *
 * WICHTIG: Dieser Key ist per Protokoll-Design ÖFFENTLICH — er wird als
 * Klartext-File unter https://www.chairmatch.de/<KEY>.txt an jeden
 * ausgeliefert (so verifizieren Bing/Yandex/Seznam den Host-Besitz).
 * Er ist also KEIN Secret und darf im Repo liegen. Er gewährt keinerlei
 * Zugriff; das Schlimmste, was ein Dritter damit tun kann, ist unsere
 * eigenen URLs bei Suchmaschinen zur Indexierung anzumelden.
 *
 * Rotation: neuen Key generieren (openssl rand -hex 16), hier ersetzen,
 * public/<NEUER_KEY>.txt anlegen, alte .txt löschen, deployen.
 * ENV INDEXNOW_KEY überschreibt diesen Wert weiterhin (siehe indexing.ts).
 */
export const INDEXNOW_FALLBACK_KEY = '27445fd790d3b27570ee01542904b680'
