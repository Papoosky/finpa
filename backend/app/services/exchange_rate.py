import logging

import httpx

logger = logging.getLogger(__name__)

_MINDICADOR_URL = "https://mindicador.cl/api/dolar"


async def get_usd_to_clp() -> float:
    """Return today's USD/CLP rate from mindicador.cl (official Chilean indicator).

    Raises RuntimeError if the request fails or the response is malformed.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(_MINDICADOR_URL)
            response.raise_for_status()
            data = response.json()
            rate: float = float(data["serie"][0]["valor"])
            logger.info("USD/CLP rate fetched: %.2f", rate)
            return rate
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        logger.exception("Failed to fetch USD/CLP rate: %s", exc)
        msg = f"No se pudo obtener el tipo de cambio USD/CLP: {exc}"
        raise RuntimeError(msg) from exc
