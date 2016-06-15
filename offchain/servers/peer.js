import express from 'express'
import bodyParser from 'body-parser'
import { Logic } from '../logic.js'

export default function (globals) {
  let app = express()
  app.use(bodyParser.json())

  const logic = new Logic(globals)

  function handlerFactory (method) {
    return function (req, res) {
      console.log('\n' + 'peer API:', method, req.body)
      // use the request header to figure out the counterparty
      req.body.counterpartyUrl = req.headers.host
      logic[method](req.body)
      .then(result => {
        res.json(result)
      })
      .catch(error => {
        console.log(error)
        res.status(500).send({ error: error.message })
      })
    }
  }

  app.post('/add_proposed_channel', handlerFactory('addProposedChannel'))
  app.post('/add_proposed_update', handlerFactory('addProposedUpdate'))
  app.post('/add_accepted_update', handlerFactory('addAcceptedUpdate'))

  return app
}
