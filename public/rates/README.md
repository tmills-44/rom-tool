# Per Diem Rate Files

Drop your GSA/State Dept Excel files here. The app loads them automatically on startup.

## Expected files

| Filename | Source | Notes |
|---|---|---|
| `conus.xlsx` | GSA FY Zip Code file | `Name`, `State`, `Oct`–`Sep`, `Meals` columns |
| `oconus.xlsx` | State Dept foreign per diem | `Country`, `Location`/`Post`, `Lodging`, `M&IE` columns |

## After updating files

If running locally: refresh the browser — the dev server serves `public/` live.  
If deployed to Netlify: run `npm run build` and redeploy.

## Column name flexibility

The parser tries common variations, so most GSA/State Dept exports work as-is.
