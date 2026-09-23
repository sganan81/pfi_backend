const axios = require('axios')
const { URLSearchParams } = require('node:url')
const URL = process.env.URL_API
const sortableFields = ['id', 'firstname', 'lastname', 'email', 'company', 'city', 'country', 'phone', 'active', 'createdAt']

function positiveInteger (value, fallback, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 1 && number <= max ? number : null
}

async function fetchList (params) {
  try {
    const { data } = await axios.get(`${URL}/api/v1/empleados?${params}`, { timeout: 15000 })
    if (!Array.isArray(data)) throw new Error('Respuesta inválida del proveedor')
    return data
  } catch (error) {
    // MockAPI devuelve 404 cuando una búsqueda no tiene coincidencias.
    if (params.has('filter') && error.response?.status === 404 && error.response?.data === 'Not found') return []
    throw error
  }
}

const getEmpleados = async (req, res) => {
  const { filter, sortBy, order } = req.query
  const paginated = req.query.page !== undefined || req.query.limit !== undefined
  const page = positiveInteger(req.query.page, 1)
  const limit = positiveInteger(req.query.limit, 10, 100)
  if (page === null || limit === null ||
    (filter !== undefined && (typeof filter !== 'string' || filter.length > 200)) ||
    (sortBy !== undefined && !sortableFields.includes(sortBy)) ||
    (order !== undefined && !['asc', 'desc'].includes(order))) {
    return res.status(400).json({ msg: 'Parámetros inválidos: page >= 1, limit entre 1 y 100, sortBy válido y order asc o desc.', code: 400 })
  }

  const params = new URLSearchParams()
  if (filter?.trim()) params.set('filter', filter.trim())
  if (sortBy) params.set('sortBy', sortBy)
  if (order) params.set('order', order)

  try {
    if (!paginated) {
      const data = await fetchList(params)
      return res.status(200).json({ msg: 'Ok', code: 200, data })
    }
    // MockAPI no incluye el total en la respuesta estándar. Consultamos la
    // colección filtrada para contarlo y luego solicitamos la página al proveedor.
    const countParams = new URLSearchParams()
    if (params.has('filter')) countParams.set('filter', params.get('filter'))
    const matches = await fetchList(countParams)
    const total = matches.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const currentPage = Math.min(page, totalPages)
    params.set('page', currentPage)
    params.set('limit', limit)
    const data = total === 0 ? [] : await fetchList(params)
    return res.status(200).json({
      msg: 'Ok',
      code: 200,
      data,
      pagination: { page: currentPage, limit, total, totalPages }
    })
  } catch (error) {
    return res.status(502).json({ msg: 'No se pudo consultar el proveedor de empleados.', code: 502 })
  }
}

const getEmpleado = async (req, res) => {
  try {
    const { data } = await axios.get(`${URL}/api/v1/empleados/${encodeURIComponent(req.params.id)}`, { timeout: 15000 })
    return res.status(200).json({ msg: 'Ok', code: 200, data })
  } catch (error) {
    const code = error.response?.status === 404 ? 404 : 502
    return res.status(code).json({ msg: code === 404 ? 'Empleado no encontrado.' : 'No se pudo consultar el proveedor de empleados.', code })
  }
}

module.exports = { getEmpleados, getEmpleado }
