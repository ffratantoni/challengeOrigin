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


def register_and_token(client, username):
    assert client.post('/auth/register', json={'username': username,
                       'email': f'{username}@x.com', 'password': 'abcd'}).status_code == 200
    l = client.post(
        '/auth/login', data={'username': username, 'password': 'abcd'})
    assert l.status_code == 200
    return l.json().get('access_token')


def test_add_list_remove_favorites(client):
    t = register_and_token(client, 'favuser')
    headers = {'Authorization': f'Bearer {t}'}

    # list initially empty
    l = client.get('/me/favorites/', headers=headers)
    assert l.status_code == 200
    assert l.json() == []

    # add favorite
    a = client.post('/me/favorites/', json={'symbol': 'AAA'}, headers=headers)
    assert a.status_code == 200
    assert a.json().get('symbol') == 'AAA'

    # add duplicate should not fail
    a2 = client.post('/me/favorites/', json={'symbol': 'AAA'}, headers=headers)
    assert a2.status_code == 200

    # list shows single entry
    l2 = client.get('/me/favorites/', headers=headers)
    assert l2.status_code == 200
    assert l2.json() == ['AAA']

    # remove
    d = client.delete('/me/favorites/AAA', headers=headers)
    assert d.status_code == 200
    assert d.json().get('deleted') is True

    l3 = client.get('/me/favorites/', headers=headers)
    assert l3.status_code == 200
    assert l3.json() == []
