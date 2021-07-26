import pytest
import requests

def test_home_page():
    response = requests.get("http://10.0.0.20:30030")
    assert response.status_code == 200

def test_finding_product():
    response = requests.get("http://10.0.0.20:30030/?id=121")
    assert response.status_code == 200

def test_invalid_link():
    response = requests.get("http://10.0.0.21:30030/admin")
    assert response.status_code == 404
