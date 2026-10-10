// Local test binding only: no routes, schedules, production identifiers or secrets.
export default { fetch() { return new Response('local identity runtime'); } };
