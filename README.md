# RoadToWellness

Applicazione React single-page con backend Express e database SQLite.

## Avvio backend

```bash
npm install
npm start
```

## Inizializzazione SQLite con script completo

È disponibile uno script SQL completo in `db/init.sql` con schema, indici, seed e view.

Esempio (con client `sqlite3`):

```bash
sqlite3 roadtowellness.db < db/init.sql
```

Il backend espone:
- `GET /api/health`
- `GET /api/state`
- `PUT /api/state`

Il DB SQLite viene creato automaticamente come `roadtowellness.db`.

## Frontend

`App.jsx` ora sincronizza i dati con `http://localhost:4000/api/state`.
Se il backend non è raggiungibile, usa il fallback su `localStorage`.
