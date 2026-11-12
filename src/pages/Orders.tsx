import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock,
  PackageCheck,
  RotateCw,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Badge, Button, Card, EmptyState, PageHeader, Select, Skeleton, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { formatCOP, formatDate } from '../lib/format'
import type { QuoteStatus } from '../lib/types'

const ORDER_STATUS: Record<
  QuoteStatus,
  { label: string; tone: 'warning' | 'success' | 'neutral' }
> = {
  pendiente: { label: 'Pendiente de revisión', tone: 'warning' },
  confirmada: { label: 'Confirmado', tone: 'success' },
  cancelada: { label: 'Cancelado', tone: 'neutral' },
}

export function Orders() {
  const { user, loading } = useAuth()
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['client-orders', { estado, page }],
    queryFn: () =>
      api.client.orders({
        estado: estado || undefined,
        page,
        page_size: 10,
      }),
    enabled: user?.role === 'cliente',
    refetchInterval: 30_000,
  })

  if (loading) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) return <Navigate to="/cuenta/ingresar" replace />
  if (user.role !== 'cliente') return <Navigate to="/admin" replace />

  const updateStatus = (value: string) => {
    setEstado(value)
    setPage(1)
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        title="Mis pedidos"
        description="Consulta el estado y los detalles de tus pedidos."
        actions={
          <Link
            to="/cuenta/ingresar"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Mi cuenta
          </Link>
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <Select
            value={estado}
            onChange={(event) => updateStatus(event.target.value)}
            aria-label="Filtrar pedidos por estado"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="confirmada">Confirmados</option>
            <option value="cancelada">Cancelados</option>
          </Select>
          <p className="text-sm text-ink-muted">
            {data ? `${data.total} ${data.total === 1 ? 'pedido' : 'pedidos'}` : '…'}
          </p>
        </div>
      </Card>

      {isError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>No pudimos cargar tus pedidos. Revisa tu conexión e inténtalo de nuevo.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title={estado ? 'No tienes pedidos con este estado' : 'Aún no tienes pedidos'}
          description={
            estado
              ? 'Prueba con otro filtro para consultar tus pedidos.'
              : 'Cuando realices un pedido desde el catálogo, podrás seguir su estado aquí.'
          }
          action={
            <Link
              to="/catalogo"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Explorar catálogo
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-4">
            {data.items.map((order) => {
              const status = ORDER_STATUS[order.status]
              return (
                <Card key={order.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sand-200 bg-sand-50/60 px-4 py-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl text-ink">Pedido #{order.id}</h2>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        Realizado {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-ink">{formatCOP(order.total_cop)}</p>
                      <p className="text-xs text-ink-muted">
                        {order.total_units} {order.total_units === 1 ? 'unidad' : 'unidades'}
                      </p>
                    </div>
                  </div>

                  <ul className="divide-y divide-sand-100 px-4">
                    {order.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-ink">{item.product_name}</p>
                          <p className="text-xs text-ink-muted">
                            {item.volume_ml} ml
                            {item.bottle_type ? ` · ${item.bottle_type}` : ''}
                            {' · '}
                            {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-ink">
                          {formatCOP(item.line_total_cop)}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-start gap-2 border-t border-sand-200 px-4 py-3 text-xs text-ink-muted">
                    {order.status === 'pendiente' ? (
                      <>
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                          Tu vendedor revisará disponibilidad y precio.
                          {order.expires_at
                            ? ` El pedido vence el ${formatDate(order.expires_at)} si no se confirma.`
                            : ''}
                        </span>
                      </>
                    ) : order.status === 'confirmada' ? (
                      <>
                        <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>
                          Tu pedido fue confirmado
                          {order.confirmed_by_name ? ` por ${order.confirmed_by_name}` : ''}.
                        </span>
                      </>
                    ) : order.cancelled_automatically ? (
                      <>
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                        <span>El pedido venció y se canceló automáticamente por falta de confirmación.</span>
                      </>
                    ) : (
                      <>
                        <Ban className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                        <span>
                          El pedido fue cancelado
                          {order.cancelled_by_name ? ` por ${order.cancelled_by_name}` : ''}.
                        </span>
                      </>
                    )}
                    {order.status === 'confirmada' && (
                      <CheckCircle2 className="ml-auto hidden h-4 w-4 shrink-0 text-emerald-600 sm:block" />
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          {data.pages > 1 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Anterior
              </Button>
              <span className="text-xs text-ink-muted">
                Página {data.page} de {data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((current) => current + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
