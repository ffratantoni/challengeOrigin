import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure import repository, models
from app.infrastructure.database import SessionLocal, Base, engine


@pytest.fixture(scope='module')
def client():
    # ensure fresh DB schema for tests
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    c = TestClient(app)
    yield c


def test_trade_and_transfer_flow(client):
    # create two users via API
    r1 = client.post(
        '/auth/register', json={'username': 'alice', 'email': 'a@a.com', 'password': 'secret'})
    assert r1.status_code == 200
    r2 = client.post(
        '/auth/register', json={'username': 'bob', 'email': 'b@b.com', 'password': 'secret'})
    assert r2.status_code == 200

    # login alice
    la = client.post(
        '/auth/login', data={'username': 'alice', 'password': 'secret'})
    assert la.status_code == 200
    token = la.json().get('access_token')
    assert token

    headers = {'Authorization': f'Bearer {token}'}

    # alice buys 10 SHARES of AAPL
    t = client.post('/me/portfolio/trade',
                    json={'symbol': 'FOO', 'quantity': 10, 'buy': True}, headers=headers)
    assert t.status_code == 200
    assert t.json()['symbol'] == 'FOO'
    assert t.json()['quantity'] == 10

    # transfer 4 shares to bob
    tr = client.post('/me/portfolio/transfer',
                     json={'to_username': 'bob', 'amount': 4, 'symbol': 'FOO'}, headers=headers)
    assert tr.status_code == 200

    # check alice portfolio
    p_alice = client.get('/me/portfolio/', headers=headers)
    assert p_alice.status_code == 200
    items = p_alice.json()
    assert any(i['symbol'] == 'FOO' and i['quantity'] == 6 for i in items)

    # login bob and check portfolio
    lb = client.post(
        '/auth/login', data={'username': 'bob', 'password': 'secret'})
    assert lb.status_code == 200
    tb = lb.json().get('access_token')
    hb = {'Authorization': f'Bearer {tb}'}
    p_bob = client.get('/me/portfolio/', headers=hb)
    assert p_bob.status_code == 200
    items_b = p_bob.json()
    assert any(i['symbol'] == 'FOO' and i['quantity'] == 4 for i in items_b)


def test_insufficient_sell(client):
    # user with no holdings tries to sell
    r = client.post(
        '/auth/register', json={'username': 'carl', 'email': 'c@c.com', 'password': 'pw12'})
    assert r.status_code == 200
    la = client.post(
        '/auth/login', data={'username': 'carl', 'password': 'pw12'})
    assert la.status_code == 200
    token = la.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}

    sell = client.post('/me/portfolio/trade',
                       json={'symbol': 'NOPE', 'quantity': 5, 'buy': False}, headers=headers)
    assert sell.status_code == 400


def test_transfer_insufficient_shares(client):
    # create users
    assert client.post('/auth/register', json={
                       'username': 'dave', 'email': 'd@d.com', 'password': 'pw12'}).status_code == 200
    assert client.post('/auth/register', json={
                       'username': 'erin', 'email': 'e@e.com', 'password': 'pw12'}).status_code == 200
    la = client.post(
        '/auth/login', data={'username': 'dave', 'password': 'pw12'})
    assert la.status_code == 200
    token = la.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}

    # attempt to transfer shares not owned
    tr = client.post('/me/portfolio/transfer',
                     json={'to_username': 'erin', 'amount': 3, 'symbol': 'ABC'}, headers=headers)
    assert tr.status_code == 400


def test_transfer_zero_amount(client):
    # create users
    assert client.post('/auth/register', json={
                       'username': 'gina', 'email': 'g@g.com', 'password': 'pw12'}).status_code == 200
    assert client.post('/auth/register', json={
                       'username': 'hank', 'email': 'h@h.com', 'password': 'pw12'}).status_code == 200
    la = client.post(
        '/auth/login', data={'username': 'gina', 'password': 'pw12'})
    assert la.status_code == 200
    token = la.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}

    tr = client.post('/me/portfolio/transfer',
                     json={'to_username': 'hank', 'amount': 0, 'symbol': None}, headers=headers)
    assert tr.status_code == 400


def test_remove_holding_on_zero(client):
    # create user
    assert client.post('/auth/register', json={'username': 'ivy',
                       'email': 'i@i.com', 'password': 'pw12'}).status_code == 200
    la = client.post(
        '/auth/login', data={'username': 'ivy', 'password': 'pw12'})
    assert la.status_code == 200
    token = la.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}

    # buy 3
    b = client.post('/me/portfolio/trade',
                    json={'symbol': 'DEL', 'quantity': 3, 'buy': True}, headers=headers)
    assert b.status_code == 200
    # sell 3
    s = client.post('/me/portfolio/trade',
                    json={'symbol': 'DEL', 'quantity': 3, 'buy': False}, headers=headers)
    assert s.status_code == 200

    p = client.get('/me/portfolio/', headers=headers)
    assert p.status_code == 200
    items = p.json()
    assert all(not (i['symbol'] == 'DEL') for i in items)
