import { EmailTemplate } from "../entity/EmailTemplate";
import { getManager } from 'typeorm';
import { EmailTemplateType } from "../types/EmailTemplateType";
import { Locale } from '../types/Locale';

export async function initializeEmailTemplates() {
  const signatureDef = new EmailTemplate();
  signatureDef.key = EmailTemplateType.Signature;
  signatureDef.locale = Locale.Engish;

  const signUpEmailDef = new EmailTemplate();
  signUpEmailDef.key = EmailTemplateType.SignUp;
  signUpEmailDef.locale = Locale.Engish;
  signUpEmailDef.vars = ['website', 'email', 'url'];

  const resetPasswordEmailDef = new EmailTemplate();
  resetPasswordEmailDef.key = EmailTemplateType.ResetPassword;
  resetPasswordEmailDef.locale = Locale.Engish;
  resetPasswordEmailDef.vars = ['website', 'toWhom', 'url'];

  const inviteUserEmailDef = new EmailTemplate();
  inviteUserEmailDef.key = EmailTemplateType.InviteUser;
  inviteUserEmailDef.locale = Locale.Engish;
  inviteUserEmailDef.vars = ['website', 'toWhom', 'email', 'url'];

  const googleSsoWelcomeEmailDef = new EmailTemplate();
  googleSsoWelcomeEmailDef.key = EmailTemplateType.GoogleSsoWelcome;
  googleSsoWelcomeEmailDef.locale = Locale.Engish;
  googleSsoWelcomeEmailDef.vars = ['website', 'toWhom'];

  const deleteUserEmailDef = new EmailTemplate();
  deleteUserEmailDef.key = EmailTemplateType.DeleteUser;
  deleteUserEmailDef.locale = Locale.Engish;
  deleteUserEmailDef.vars = ['website', 'toWhom', 'email'];

  const contactEmailDef = new EmailTemplate();
  contactEmailDef.key = EmailTemplateType.Contact;
  contactEmailDef.locale = Locale.Engish;
  contactEmailDef.vars = ['website', 'name', 'contact', 'message'];

  const entities = [
    signatureDef,
    signUpEmailDef,
    resetPasswordEmailDef,
    inviteUserEmailDef,
    googleSsoWelcomeEmailDef,
    deleteUserEmailDef,
    contactEmailDef
  ];

  await getManager()
    .createQueryBuilder()
    .insert()
    .into(EmailTemplate)
    .values(entities)
    .orIgnore()
    .execute();
}
