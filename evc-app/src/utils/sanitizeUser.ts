import { User } from '../entity/User';
import * as _ from 'lodash';


export function sanitizeUser(user: User) {
  return _.pick(user, [
    'id',
    'email',
    'givenName',
    'surname',
    'role',
    'lastLoggedInAt',
    'country',
    'locale',
    'status',
    'loginType'
  ]);
}
