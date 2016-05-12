export function postFactory (logics, calls, myUrl) {
  return async function post (url, body) {
    const [ who, method ] = url.split('/')
    
    try {
      return await logics[who][calls['/' + method]](body, myUrl)
    } catch (error) {
      console.log(error)
      return { error: error.message }
    }
  }
}
   