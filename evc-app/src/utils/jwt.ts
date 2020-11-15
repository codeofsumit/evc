
import * as jwt from 'jsonwebtoken';
import { getUtcNow } from './getUtcNow';
import * as moment from 'moment';
import { UserRole } from 'aws-sdk/clients/workmail';
import { assert } from './assert';
import { sanitizeUser } from './sanitizeUser';
import { getRepository } from 'typeorm';
import { User } from '../entity/User';

const cookieName = 'jwt';
const isProd = process.env.NODE_ENV === 'prod';

export function attachJwtCookie(user, res) {
  assert(user.id, 500, `User has no id`);
  const payload = sanitizeUser(user);
  payload.expires = moment(getUtcNow()).add(30, 'minutes').toDate();

  const token = jwt.sign(payload, JwtSecret);

  res.cookie(cookieName, token, {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    expires: moment(getUtcNow()).add(24, 'hours').toDate(),
    signed: false,
    sameSite: isProd ? 'strict' : undefined,
    secure: isProd ? true : undefined,
  });
}

export const JwtSecret = 'techseeding.evc';

export function verifyJwtFromCookie(req) {
  const token = req.cookies[cookieName];
  let user = null;
  if (token) {
    user = jwt.verify(token, JwtSecret);
    // const { expires } = user;
    // assert(moment(expires).isAfter(), 401, 'Token expired');
  }

  return user;
}

export function clearJwtCookie(res) {
  res.clearCookie(cookieName);
}