'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = path.join(__dirname, 'data', 'accounts.json');

function loadAccounts() {
  if (!fs.existsSync(FILE)) return {};
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function saveAccounts(accounts) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const temporary = FILE + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(accounts, null, 2), {
    encoding: 'utf8',
    mode: 0o600
  });
  fs.renameSync(temporary, FILE);
}

function register(username, password) {
  if (typeof username !== 'string' ||
      !/^[a-zA-Z0-9_-]{3,24}$/.test(username)) {
    throw new Error('Username must be 3-24 letters, numbers, _ or -');
  }

  if (typeof password !== 'string' ||
      password.length < 10 || password.length > 128) {
    throw new Error('Password must be 10-128 characters');
  }

  const name = username.toLowerCase();
  const accounts = loadAccounts();

  if (accounts[name]) {
    throw new Error('Username already exists');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');

  accounts[name] = { salt, hash };
  saveAccounts(accounts);

  return name;
}

function verify(username, password) {
  if (typeof username !== 'string' ||
      typeof password !== 'string') return false;

  const account = loadAccounts()[username.toLowerCase()];
  if (!account) return false;

  const submitted = crypto.scryptSync(password, account.salt, 64);
  const expected = Buffer.from(account.hash, 'hex');

  return submitted.length === expected.length &&
    crypto.timingSafeEqual(submitted, expected);
}

module.exports = { register, verify };
