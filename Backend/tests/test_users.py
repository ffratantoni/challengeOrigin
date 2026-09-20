import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.database import Base, engine


@pytest.fixture(scope='module')
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    c = TestClient(app)
    yield c


def test_register_and_profile(client):
    r = client.post(
        '/auth/register', json={'username': 'testu', 'email': 't@t.com', 'password': 'abcd'})
    assert r.status_code == 200
    # login
    l = client.post(
        '/auth/login', data={'username': 'testu', 'password': 'abcd'})
    assert l.status_code == 200
    token = l.json().get('access_token')
    assert token
    headers = {'Authorization': f'Bearer {token}'}
    me = client.get('/users/me', headers=headers)
    assert me.status_code == 200
    data = me.json()
    assert data['username'] == 'testu'
    assert data['email'] == 't@t.com'


def test_user_list_requires_auth(client):
    r = client.get('/users/')
    assert r.status_code == 401
