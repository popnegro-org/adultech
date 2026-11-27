const REGISTRATION_ACCEPTED = Object.freeze({
  status: 202,
  body: Object.freeze({
    ok: true,
    message: 'Si podés crear una cuenta con esos datos, ya podés iniciar sesión. Si ya tenés una cuenta, iniciá sesión.',
  }),
});

export function registrationAcceptedResponse() {
  return REGISTRATION_ACCEPTED;
}
