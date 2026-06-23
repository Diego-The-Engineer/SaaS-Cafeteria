import requests

url = "https://sandbox.ecartpay.com/api/authorizations/token"

headers = {
    "accept": "application/json",
    "authorization": "Basic cHViNmEzYWVlNTlkYWYyZGU4ODZlOWNkZDk1OnByaXY2YTNhZWU1OWRhZjJkZTg4NmU5Y2RkOTY="
}

response = requests.post(url, headers=headers)

data = response.json()

token_ecart = data.get("token")
print(f"¡Éxito! Mi token de eCartPay es: {token_ecart}")