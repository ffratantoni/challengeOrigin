from fastapi import APIRouter, HTTPException, Query
import os
import httpx
import urllib.parse
from typing import List, Dict, Any
from fastapi import Request
import json

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get('/', summary='Proxy to Twelve Data /stocks (returns symbol, name, currency)')
async def get_stocks(
    page: int = Query(1, ge=1),
    outputsize: int = Query(100, ge=1, le=1000),
    symbol: str | None = Query(None),
    source: str | None = Query(None),
    country: str | None = Query(None),
    exchange: str | None = Query(None),
    instrument_type: str | None = Query(None, alias='type')
) -> List[Dict[str, Any]]:
    EXTERNAL_BASE = os.getenv('STOCKS_API_URL_BASE',
                              'https://api.twelvedata.com')
    API_KEY = os.getenv('STOCKS_API_KEY', 'd6d70198bb0a4e679ecf83b12b6966d8')
    endpoint = f"{EXTERNAL_BASE}/stocks"

    # Default country when no filters provided
    if symbol is None and country is None and exchange is None:
        country = os.getenv('STOCKS_DEFAULT_COUNTRY', 'United States')

    params_list = [
        ('apikey', API_KEY),
        ('page', str(page)),
        ('outputsize', str(outputsize)),
        ('format', 'JSON'),
    ]
    if country:
        params_list.append(('country', country))
    if exchange:
        params_list.append(('exchange', exchange))
    if instrument_type:
        params_list.append(('type', instrument_type))

    # If caller passed a CSV, prepare repeated 'symbol' params
    if symbol and isinstance(symbol, str) and ',' in symbol:
        for s in (s.strip() for s in symbol.split(',') if s.strip()):
            params_list.append(('symbol', s))

    r = None
    # ensure r is defined for exception handling
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            # Single-symbol: forward exactly symbol + optional source
            if symbol and isinstance(symbol, str) and ',' not in symbol:
                params = {'apikey': API_KEY,
                          'symbol': symbol, 'format': 'JSON'}
                if source:
                    params['source'] = source
                safe = {k: ('***' if k == 'apikey' else v)
                        for k, v in params.items()}

                r = await client.get(endpoint, params=params)
            else:
                qs = urllib.parse.urlencode(params_list, doseq=True)
                safe = [(k, ('***' if k == 'apikey' else v))
                        for (k, v) in params_list]

                url = f"{endpoint}?{qs}"
                r = await client.get(url)

            r.raise_for_status()
            payload = r.json()
    except Exception as e:
        # Log details for diagnosis, but return a generic error to the client
        status = getattr(r, 'status_code', None) if r is not None else None
        url = getattr(r, 'url', None) if r is not None else endpoint
        snippet = (getattr(r, 'text', '')[:300] if r is not None else '')

        raise HTTPException(
            status_code=502, detail='Error fetching stocks from external API')

    # Normalize response -> list of items
    if isinstance(payload, dict) and isinstance(payload.get('data'), list):
        data = payload['data']
    elif isinstance(payload, list):
        data = payload
    else:
        raise HTTPException(
            status_code=502, detail='Unexpected response format from external API')

    return [
        {
            'simbolo': str(item.get('symbol') or ''),
            'nombre': item.get('name') or '',
            'moneda': item.get('currency') or ''
        }
        for item in data
    ]


@router.get('/timeseries', summary='Proxy time series for symbol')
async def get_timeseries(request: Request, symbol: str = Query(...), mode: str = Query('realtime'), interval: str = Query('1min'), start_date: str | None = Query(None), end_date: str | None = Query(None)):
    """Proxy endpoint for time series. mode: 'realtime'|'historical'. interval: '1min'|'5min'|'15min'"""
    EXTERNAL_BASE = os.getenv('STOCKS_API_URL_BASE',
                              'https://api.twelvedata.com')
    API_KEY = os.getenv('STOCKS_API_KEY', 'd6d70198bb0a4e679ecf83b12b6966d8')
    endpoint = f"{EXTERNAL_BASE}/time_series"

    # map our interval to Twelve Data's interval format if needed
    params = {
        'apikey': API_KEY,
        'symbol': symbol,
        'interval': interval,
        'format': 'JSON',
        'outputsize': '200'
    }
    if start_date:
        params['start_date'] = start_date
    if end_date:
        params['end_date'] = end_date
    # realtime vs historical may map to different endpoints or params; keep simple
    r = None
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(endpoint, params=params)
            r.raise_for_status()
            payload = r.json()
    except Exception as e:
        # Include external response text (truncated) for local diagnosis
        snippet = getattr(r, 'text', '')[:500] if r is not None else ''
        raise HTTPException(
            status_code=502, detail=f'Error fetching time series from external API: {snippet}')

    # Normalize: Twelve Data returns { values: [ { datetime, close }, ... ] }
    values = []
    timestamps = []
    if isinstance(payload, dict) and isinstance(payload.get('values'), list):
        for item in reversed(payload['values']):
            timestamps.append(item.get('datetime') or item.get('timestamp'))
            # prefer close, fallback to close_price or '1. open'
            v = item.get('close') or item.get(
                'close_price') or item.get('1. open')
            try:
                values.append(float(v))
            except Exception:
                values.append(None)
    else:
        raise HTTPException(
            status_code=502, detail='Unexpected time series format')

    return {'timestamps': timestamps, 'values': values}
