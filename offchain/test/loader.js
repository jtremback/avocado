require('babel-register')
var index = require('./index.js').default

index().then(result => {
  console.log('Result:', result)
}).catch(error => {
  console.log(error)
})
