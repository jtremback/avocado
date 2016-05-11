import express from 'express'
import bodyParser from 'body-parser'
import { Logic } from '../logic.js'

export default function (globals) {
  let app = express()
  app.use(bodyParser.json())
  
  const logic = new Logic(globals)
  
  function handlerFactory (method) {
    return function (req, res) {
      console.log('\n' + 'caller API:', method, req.body)
      logic[method](req.body)
      .then(result => {
        res.send(result)
      })
      .catch(error => {
        console.log(error)
        res.status(500).send({ error: error.message })
      })
    }
  }
  
  app.post('/view_proposed_channels', handlerFactory('viewProposedChannels'))
  app.post('/accept_proposed_channel', handlerFactory('acceptProposedChannel'))
  app.post('/propose_channel', handlerFactory('proposeChannel'))
  app.post('/accept_channel', handlerFactory('acceptChannel'))
  app.post('/accept_proposed_channel', handlerFactory('acceptProposedChannel'))
  app.post('/propose_update', handlerFactory('proposeUpdate'))
  app.post('/accept_update', handlerFactory('acceptUpdate'))
  app.post('/accept_last_update', handlerFactory('acceptLastUpdate'))
  app.post('/post_update', handlerFactory('postUpdate'))
  app.post('/start_challenge_period', handlerFactory('startChallengePeriod'))
  
  return app
}

