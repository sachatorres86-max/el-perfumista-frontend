import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, UserCog } from 'lucide-react'
import { api } from '../../lib/api'
import type { AdminUser, AdminUserInput, Role } from '../../lib/types'
import { formatDate } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { Modal } from '../../components/Modal'
import { cn } from '../../lib/cn'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
} from '../../components/ui'

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
  cliente: 'Cliente',
}

const ROLE_TONES: Record<Role, 'brand' | 'accent' | 'neutral'> = {
  admin: 'brand',
  vendedor: 'accent',
  cliente: 'neutral',
}

interface UserFormState {
  id?: number
  name: string
  email: string
  password: string
  role: Role
  active: boolean
}

function emptyForm(): UserFormState {
  return {
    name: '',
    email: '',
    password: '',
    role: 'vendedor',
    active: true,
  }
}

export function Users() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<UserFormState>(emptyForm())

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: api.admin.users,
  })

  const saveMutation = useMutation({
    mutationFn: (payload: { id?: number; data: AdminUserInput }) =>
      payload.id
        ? api.admin.updateUser(payload.id, payload.data)
        : api.admin.createUser(payload.data),
    onSuccess: () => {
      toast(form.id ? 'Usuario actualizado' : 'Usuario creado')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setFormOpen(false)
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const openCreate = () => {
    setForm(emptyForm())
    setFormOpen(true)
  }

  const openEdit = (user: AdminUser) => {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active,
    })
    setFormOpen(true)
  }

  const isEditingSelf = form.id === currentUser?.id

  const onSubmit = () => {
    if (!form.name.trim()) {
      toast('El nombre es obligatorio', 'error')
      return
    }
    if (!form.email.trim()) {
      toast('El correo es obligatorio', 'error')
      return
    }
    if (!form.id && form.password.length < 8) {
      toast('La contraseña debe tener al menos 8 caracteres', 'error')
      return
    }
    if (form.password && form.password.length < 8) {
      toast('La contraseña debe tener al menos 8 caracteres', 'error')
      return
    }

    const data: AdminUserInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      active: form.active,
    }
    if (form.password) data.password = form.password

    saveMutation.mutate({ id: form.id, data })
  }

  return (
    <>
      <PageHeader
        title="Usuarios y roles"
        description="Administra las cuentas con acceso al panel y sus permisos."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<UserCog className="h-8 w-8" />}
          title="No hay usuarios"
          description="Crea la primera cuenta con acceso al panel."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_auto] gap-4 border-b border-sand-200 bg-sand-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted lg:grid">
            <span>Usuario</span>
            <span>Rol</span>
            <span>Estado</span>
            <span className="text-right">Acciones</span>
          </div>
          <ul className="divide-y divide-sand-200">
            {users.map((user) => (
              <li
                key={user.id}
                className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_auto] lg:items-center"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {user.name}
                    {user.id === currentUser?.id && (
                      <span className="ml-2 text-[11px] font-medium text-ink-muted">(tú)</span>
                    )}
                  </p>
                  <p className="text-xs text-ink-muted">{user.email}</p>
                </div>
                <div>
                  <Badge tone={ROLE_TONES[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                </div>
                <div className="text-sm">
                  <Badge tone={user.active ? 'success' : 'neutral'}>
                    {user.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <span className="ml-2 text-[11px] text-ink-muted">
                    {formatDate(user.created_at)}
                  </span>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                    Editar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.id ? 'Editar usuario' : 'Nuevo usuario'}
        description={
          form.id
            ? 'Actualiza los datos, el rol o el estado de la cuenta.'
            : 'Crea una cuenta de cliente, vendedor o administrador.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onSubmit} loading={saveMutation.isPending}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Nombre completo"
            />
          </Field>
          <Field label="Correo" required className="sm:col-span-2">
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="correo@ejemplo.com"
            />
          </Field>
          <Field
            label={form.id ? 'Nueva contraseña' : 'Contraseña'}
            hint={form.id ? 'Déjala vacía para conservar la actual.' : 'Mínimo 8 caracteres.'}
            required={!form.id}
            className="sm:col-span-2"
          >
            <Input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="••••••••"
            />
          </Field>
          <Field label="Rol" hint={isEditingSelf ? 'No puedes cambiar tu propio rol.' : undefined}>
            <Select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
              disabled={isEditingSelf}
            >
              <option value="vendedor">Vendedor</option>
              <option value="cliente">Cliente</option>
              <option value="admin">Administrador</option>
            </Select>
          </Field>
          <Field label="Estado">
            <div
              className={cn(
                'flex h-11 items-center gap-2 rounded-xl border border-sand-300 bg-white px-3.5',
                isEditingSelf ? 'cursor-not-allowed bg-sand-100 opacity-60' : 'cursor-pointer',
              )}
            >
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
                className="h-4 w-4 accent-brand-600"
                disabled={isEditingSelf}
              />
              <span className="text-sm font-medium text-ink">Cuenta activa</span>
            </div>
          </Field>
        </div>
      </Modal>
    </>
  )
}
