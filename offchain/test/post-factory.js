export function postFactory (logics, calls) {
  return async function post (url, body) {
    const [ who, method ] = url.split('/')
    return await logics[who][calls['/' + method]](body)
  }
}