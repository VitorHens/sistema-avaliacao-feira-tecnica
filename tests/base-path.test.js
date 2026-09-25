const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const os = require('node:os');
const { getAppBasePath, stripBasePath, publicBaseUrl } = require('../src/api/utils/AppBasePath');

test('páginas e APIs funcionam sob /feira sem perder o caminho original', async () => {
  const app = express();
  app.use(stripBasePath('/feira'));
  app.get('/api/v1/teste', (req, res) => res.json({path:req.path,original:req.originalUrl}));
  app.use(express.static(path.resolve(__dirname, '../src/public')));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(`${base}/feira/login.html`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>.*Feira Técnica/);
    const api = await fetch(`${base}/feira/api/v1/teste`);
    assert.deepEqual(await api.json(), {path:'/api/v1/teste',original:'/feira/api/v1/teste'});
    assert.equal((await fetch(`${base}/feira-teste/api/v1/teste`)).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('QR local usa o único IP da rede sem expor contas de teste', () => {
  const previous = {
    interfaces: os.networkInterfaces,
    public: process.env.PUBLIC_BASE_URL,
    environment: process.env.NODE_ENV,
    testAccount: process.env.ENABLE_TEST_PROFESSOR,
  };
  const request = {protocol:'http',get:()=> 'localhost:3000'};
  try {
    os.networkInterfaces = () => ({Ethernet:[{family:'IPv4',internal:false,address:'192.168.15.39'}]});
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.NODE_ENV;
    delete process.env.ENABLE_TEST_PROFESSOR;
    assert.equal(publicBaseUrl(request), 'http://192.168.15.39:3000/feira');
    process.env.ENABLE_TEST_PROFESSOR = 'true';
    assert.equal(publicBaseUrl(request), 'http://localhost:3000/feira');
    delete process.env.ENABLE_TEST_PROFESSOR;
    process.env.NODE_ENV = 'production';
    assert.equal(publicBaseUrl(request), 'http://localhost:3000/feira');
  } finally {
    os.networkInterfaces = previous.interfaces;
    for (const [name, value] of [['PUBLIC_BASE_URL',previous.public],['NODE_ENV',previous.environment],['ENABLE_TEST_PROFESSOR',previous.testAccount]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test('endereço do QR inclui o prefixo público', () => {
  const previous = {base:process.env.APP_BASE_PATH,public:process.env.PUBLIC_BASE_URL};
  try {
    delete process.env.APP_BASE_PATH;
    delete process.env.PUBLIC_BASE_URL;
    assert.equal(getAppBasePath(), '/feira');
    assert.equal(publicBaseUrl({protocol:'https',get:()=> 'escola.example'}), 'https://escola.example/feira');
    process.env.PUBLIC_BASE_URL = 'https://escola.example/feira';
    assert.equal(publicBaseUrl({protocol:'http',get:()=> 'localhost'}), 'https://escola.example/feira');
  } finally {
    if(previous.base===undefined)delete process.env.APP_BASE_PATH;else process.env.APP_BASE_PATH=previous.base;
    if(previous.public===undefined)delete process.env.PUBLIC_BASE_URL;else process.env.PUBLIC_BASE_URL=previous.public;
  }
});
