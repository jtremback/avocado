export function postFactory (logics, calls) {
  return async function post (url, body) {
    const [ who, method ] = url.split('/')
    
    try {
      return await logics[who][calls['/' + method]](body)
    } catch (error) {
      return { error: error.message }
    }
    
    // console.log(re)
    // return re
  }
}