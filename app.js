import { Amplify } from 'aws-amplify';
import {
  signUp, confirmSignUp, resendSignUpCode,
  signIn, confirmSignIn, signOut, getCurrentUser,
  resetPassword, confirmResetPassword, updatePassword,
} from 'aws-amplify/auth';
import QRCode from 'qrcode';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-2_ejtyV8gQ8',
      userPoolClientId: '20k87u0u89k966g8309iu7o35g',
    },
  },
});

const $ = (id) => document.getElementById(id);
const titles = {
  signup: 'Create your account', verify: 'Check your email', login: 'Sign in',
  otp: 'Two-step verification', forgot: 'Reset your password', reset: 'Choose a new password',
  home: 'Welcome back',
};
let pendingEmail = '';

function say(text, isError = false) {
  // Every result ends here, so turn the submit buttons back on
  document.querySelectorAll('button[type="submit"]').forEach((b) => (b.disabled = false));
  const el = $('message');
  el.textContent = text;
  el.className = isError ? 'message error' : 'message ok';
}

function show(name) {
  document.querySelectorAll('.screen').forEach((el) => (el.hidden = true));
  $('screen-' + name).hidden = false;
  $('title').textContent = titles[name];
  say('');
}

document.querySelectorAll('[data-go]').forEach((link) => {
  link.addEventListener('click', (e) => { e.preventDefault(); show(link.dataset.go); });
});

const friendly = {
  UsernameExistsException: 'This email is already registered. Try signing in.',
  InvalidPasswordException: 'Password is too weak. Use 8+ characters with upper case, lower case, a number and a symbol.',
  CodeMismatchException: 'That code is wrong. Check it and try again.',
  ExpiredCodeException: 'That code has expired. Ask for a new one.',
  NotAuthorizedException: 'Wrong email or password.',
  LimitExceededException: 'Too many tries. Wait a few minutes and try again.',
  TooManyRequestsException: 'Too many tries. Wait a few minutes and try again.',
};
function fail(err) {
  console.error(err);
  say(friendly[err.name] || err.message, true);
}

$('screen-signup').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('su-email').value.trim();
  const password = $('su-password').value;
  try {
    const { nextStep } = await signUp({
      username: email,
      password,
      options: { userAttributes: { email } },
    });
    pendingEmail = email;
    if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
      show('verify');
      say('We sent a 6-digit code to ' + email + '.');
    }
  } catch (err) {
    fail(err);
  }
});

$('screen-verify').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await confirmSignUp({
      username: pendingEmail,
      confirmationCode: $('vf-code').value.trim(),
    });
    show('login');
    say('Email verified. You can sign in now.');
  } catch (err) {
    fail(err);
  }
});

$('resend').addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    await resendSignUpCode({ username: pendingEmail });
    say('A new code is on its way.');
  } catch (err) {
    fail(err);
  }
});

async function showHome() {
  const user = await getCurrentUser();
  const who = user.signInDetails?.loginId || user.username;
  $('who').textContent = who;
  $('avatar').textContent = who.charAt(0).toUpperCase();
  show('home');
}

async function handleStep(output) {
  const step = output.nextStep.signInStep;
  switch (step) {
    case 'DONE':
      return showHome();
    case 'CONFIRM_SIGN_UP':
      await resendSignUpCode({ username: pendingEmail });
      show('verify');
      return say('Please verify your email first. We sent a new code.');
    case 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP': {
      const details = output.nextStep.totpSetupDetails;
      const uri = details.getSetupUri('JSolutions', pendingEmail).toString();
      $('qr').src = await QRCode.toDataURL(uri);
      $('secret').textContent = details.sharedSecret;
      $('qr-box').hidden = false;
      show('otp');
      $('qr-box').hidden = false;
      return say('Scan the QR code with an authenticator app, then type the 6-digit code.');
    }
    case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
      $('qr-box').hidden = true;
      show('otp');
      return say('Open your authenticator app and type the 6-digit code.');
    case 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE':
    case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
      $('qr-box').hidden = true;
      show('otp');
      return say('We sent you a code. Type it here.');
    default:
      return say('This sign-in step is not handled yet: ' + step, true);
  }
}

$('screen-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  pendingEmail = $('li-email').value.trim();
  try {
    const output = await signIn({
      username: pendingEmail,
      password: $('li-password').value,
    });
    await handleStep(output);
  } catch (err) {
    if (err.name === 'UserAlreadyAuthenticatedException') return showHome();
    fail(err);
  }
});

$('screen-otp').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const output = await confirmSignIn({
      challengeResponse: $('otp-code').value.trim(),
    });
    $('otp-code').value = '';
    await handleStep(output);
  } catch (err) {
    fail(err);
  }
});

$('screen-forgot').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('fp-email').value.trim();
  try {
    const { nextStep } = await resetPassword({ username: email });
    pendingEmail = email;
    if (nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
      show('reset');
      say('We sent a code to ' + nextStep.codeDeliveryDetails.destination + '.');
    }
  } catch (err) {
    fail(err);
  }
});

$('screen-reset').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await confirmResetPassword({
      username: pendingEmail,
      confirmationCode: $('rp-code').value.trim(),
      newPassword: $('rp-password').value,
    });
    show('login');
    say('Password changed. Sign in with your new password.');
  } catch (err) {
    fail(err);
  }
});

$('change-pw').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await updatePassword({
      oldPassword: $('cp-old').value,
      newPassword: $('cp-new').value,
    });
    $('change-pw').reset();
    say('Password updated.');
  } catch (err) {
    fail(err);
  }
});

$('logout').addEventListener('click', async () => {
  await signOut();
  show('login');
});

// ---------- BUTTONS: disable while a request is running ----------
document.addEventListener('submit', (e) => {
  const btn = e.target.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = true;
  setTimeout(() => (btn.disabled = false), 15000); // safety net
}, true);

// ---------- PASSWORD: show / hide ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-reveal]');
  if (!btn) return;
  const input = $(btn.dataset.reveal);
  const wasVisible = input.type === 'text';
  input.type = wasVisible ? 'password' : 'text';
  btn.textContent = wasVisible ? 'Show' : 'Hide';
  btn.setAttribute('aria-label', wasVisible ? 'Show password' : 'Hide password');
});

// ---------- START-UP: stay signed in after a page refresh ----------
// KEEP THIS BLOCK AT THE VERY BOTTOM. Add any new code above it.
(async () => {
  try {
    await getCurrentUser();
    await showHome();
  } catch {
    show('login');
  }
})();