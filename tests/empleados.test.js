const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const axios = require('axios')
const { getEmpleados, getEmpleado } = require('../controllers/empleados')
const originalGet = axios.get

afterEach(() => { axios.get = originalGet })

function response () {
  return { status (code) { this.code = code; return this }, json (body) { this.body = body; return this } }
}

test('codifica el filtro y envía paginación y ordenamiento al proveedor', async () => {
  const calls = []
  axios.get = async url => {
    calls.push(new URL(url, 'http://localhost'))
    return { data: calls.length === 1 ? Array.from({ length: 12 }, (_, id) => ({ id })) : [{ id: 6 }] }
  }
  const res = response()
  await getEmpleados({ query: { filter: 'A&B + Pérez', page: '2', limit: '5', sortBy: 'lastname', order: 'desc' } }, res)
  assert.equal(res.code, 200)
  assert.equal(calls[0].searchParams.get('filter'), 'A&B + Pérez')
  assert.equal(calls[0].searchParams.has('limit'), false)
  assert.equal(calls[1].searchParams.get('page'), '2')
  assert.equal(calls[1].searchParams.get('limit'), '5')
  assert.equal(calls[1].searchParams.get('sortBy'), 'lastname')
  assert.equal(calls[1].searchParams.get('order'), 'desc')
  assert.deepEqual(res.body.pagination, { page: 2, limit: 5, total: 12, totalPages: 3 })
  assert.deepEqual(res.body.data, [{ id: 6 }])
})

test('mantiene compatible la consulta sin paginación', async () => {
  axios.get = async () => ({ data: [{ id: '1' }] })
  const res = response()
  await getEmpleados({ query: {} }, res)
  assert.deepEqual(res.body, { msg: 'Ok', code: 200, data: [{ id: '1' }] })
})

test('rechaza parámetros inválidos sin consultar al proveedor', async () => {
  axios.get = async () => { throw new Error('No debe llamarse') }
  for (const query of [{ page: '0' }, { limit: '101' }, { page: '1.5' }, { filter: ['a', 'b'] }, { order: 'random' }, { sortBy: 'secret' }]) {
    const res = response()
    await getEmpleados({ query }, res)
    assert.equal(res.code, 400)
  }
})

test('ajusta una página fuera de rango', async () => {
  const calls = []
  axios.get = async url => { calls.push(url); return { data: [{ id: '1' }] } }
  const res = response()
  await getEmpleados({ query: { page: '99', limit: '5' } }, res)
  assert.equal(res.body.pagination.page, 1)
  assert.equal(new URL(calls[1], 'http://localhost').searchParams.get('page'), '1')
})

test('convierte la búsqueda sin resultados de MockAPI en una página vacía', async () => {
  axios.get = async () => { throw Object.assign(new Error(), { response: { status: 404, data: 'Not found' } }) }
  const res = response()
  await getEmpleados({ query: { filter: 'inexistente', page: '1' } }, res)
  assert.equal(res.code, 200)
  assert.equal(res.body.pagination.total, 0)
  assert.deepEqual(res.body.data, [])
})

test('no oculta los errores de disponibilidad del proveedor', async () => {
  axios.get = async () => { throw new Error('Timeout') }
  const res = response()
  await getEmpleados({ query: { page: '1' } }, res)
  assert.equal(res.code, 502)
})

test('detalle inexistente devuelve 404', async () => {
  axios.get = async () => { throw Object.assign(new Error(), { response: { status: 404 } }) }
  const res = response()
  await getEmpleado({ params: { id: '999' } }, res)
  assert.equal(res.code, 404)
})
