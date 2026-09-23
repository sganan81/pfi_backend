const express = require('express')
const cors = require('cors')

class Server {
  constructor () {
    this.app = express()
    this.port = process.env.PORT || 3000
    this.middleware()
    this.rutas()
  }

  middleware () {
    this.app.use(cors())
    this.app.use(express.static('public'))
  }

  rutas () {
    this.app.get('/', (req, res) => res.send('Ape Express demo!'))
    this.app.use('/api/v1/pacientes', require('../routes/empleados')) // Alumno 1
    this.app.use('/api/v1/pacientes2', require('../routes/empleados')) // Alumno 2
  }

  listen () {
    this.app.listen(this.port, () => {
      console.log(`Api escuchando en el puerto: ${this.port}`)
    })
  }
}

module.exports = Server
