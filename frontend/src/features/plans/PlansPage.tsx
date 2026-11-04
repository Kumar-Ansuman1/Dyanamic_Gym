import { zodResolver } from '@hookform/resolvers/zod'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { DataTable, ListBody, ListSearch, PAGE_SIZE, Pager, StackedRow, useListParams } from '../../components/layout/List.tsx'
import { Page } from '../../components/layout/Page.tsx'
import { BOARD, Outcome, Section, type OutcomeText } from '../../components/layout/Section.tsx'
import { Button, ConfirmButton } from '../../components/ui/Button.tsx'
import { Segmented, TextField } from '../../components/ui/Field.tsx'
import { Status } from '../../components/ui/Status.tsx'
import { api, errorMessage, getPage } from '../../lib/api-client.ts'
import { formatINR, formatMonths } from '../../lib/formatters.ts'
import type { MembershipPlan } from '../../types/api.ts'

// Mirrors MembershipPlanCreate in backend/app/schemas/membership_plan.py.
const DURATIONS = [
  { value: '1', label: '1 month' },
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
] as const

const schema = z.object({
  name: z.string().trim().min(2, 'Name the plan, like Quarterly.').max(50, 'Keep the name under 50 characters.'),
  duration: z.enum(['1', '3', '6', '12']),
  price: z
    .string()
    .trim()
    .regex(/^\d{1,8}(\.\d{1,2})?$/, 'Enter the price as a number, like 3000.'),
})

type PlanValues = z.infer<typeof schema>

const STATUS = [
  { value: 'all', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
] as const

function PlanForm({
  plan,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  plan?: MembershipPlan
  pending: boolean
  error: string | null
  onSubmit: (values: PlanValues) => void
  onCancel: () => void
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PlanValues>({
    resolver: zodResolver(schema),
    defaultValues: plan
      ? { name: plan.name, duration: String(plan.duration_months) as PlanValues['duration'], price: plan.price.replace(/\.00$/, '') }
      : { name: '', duration: '1', price: '' },
  })

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label={plan ? `Edit ${plan.name}` : 'New plan'}
      className="grid gap-5 px-4 pt-5 pb-6 md:grid-cols-2 md:gap-x-6"
    >
      <TextField label="Name" autoComplete="off" error={errors.name?.message} {...register('name')} />
      <TextField
        label="Price"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        error={errors.price?.message}
        hint={plan ? 'Members already on this plan keep the price they paid.' : undefined}
        {...register('price')}
      />
      <div className="md:col-span-2">
        <Controller
          control={control}
          name="duration"
          render={({ field }) => (
            <Segmented label="Length" name={`duration-${plan?.id ?? 'new'}`} options={DURATIONS} value={field.value} onChange={field.onChange} />
          )}
        />
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-[0.8125rem] text-led md:col-span-2">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 md:col-span-2">
        <Button variant="primary" type="submit" loading={pending}>
          {plan ? 'Save plan' : 'Create plan'}
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

const PlanStatus = ({ active }: { active: boolean }) =>
  active ? <Status form="solid" label="Active" className="text-fg" /> : <Status form="hollow" label="Inactive" className="text-fg-muted" />

export function PlansPage() {
  const queryClient = useQueryClient()
  const { params, page, skip, set, setPage } = useListParams()
  const search = params.get('q') ?? ''
  const active = (params.get('active') ?? 'all') as (typeof STATUS)[number]['value']
  // 'new' for the create form, a plan id for an edit row.
  const [editing, setEditing] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<OutcomeText>(null)

  const list = useQuery({
    queryKey: ['plans', 'list', search, active, page],
    queryFn: () =>
      getPage<MembershipPlan>('/membership-plans', {
        search: search || undefined,
        is_active: active === 'all' ? undefined : active,
        skip,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const open = (id: string | null) => {
    setEditing(editing === id ? null : id)
    setFormError(null)
  }

  const save = useMutation({
    mutationFn: ({ id, values }: { id: string; values: PlanValues }) => {
      const body = { name: values.name, duration_months: Number(values.duration), price: values.price }
      const request =
        id === 'new' ? api.post<MembershipPlan>('/membership-plans', body) : api.patch<MembershipPlan>(`/membership-plans/${id}`, body)
      return request.then((r) => r.data)
    },
    onSuccess: (plan, { id }) => {
      setOutcome({
        tone: 'done',
        text: id === 'new' ? `Created ${plan.name}: ${formatMonths(plan.duration_months)} for ${formatINR(plan.price)}.` : `Saved ${plan.name}.`,
      })
      setEditing(null)
      queryClient.invalidateQueries({ queryKey: ['plans'] })
    },
    onError: (error) => setFormError(errorMessage(error)),
  })

  const setActive = useMutation({
    mutationFn: ({ plan, isActive }: { plan: MembershipPlan; isActive: boolean }) =>
      api.patch<MembershipPlan>(`/membership-plans/${plan.id}/status`, { is_active: isActive }).then((r) => r.data),
    onSuccess: (plan) => {
      setOutcome({
        tone: 'done',
        text: plan.is_active ? `${plan.name} is on sale again.` : `${plan.name} is off sale. Members already on it keep it until it ends.`,
      })
      queryClient.invalidateQueries({ queryKey: ['plans'] })
    },
    onError: (error) => setOutcome({ tone: 'warn', text: `Couldn't change the plan: ${errorMessage(error)}` }),
  })

  const busy = (plan: MembershipPlan) => setActive.isPending && setActive.variables?.plan.id === plan.id

  const actions = (plan: MembershipPlan) => (
    <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:justify-end">
      <Button size="sm" aria-expanded={editing === plan.id} onClick={() => open(plan.id)}>
        {editing === plan.id ? 'Close' : 'Edit'}
      </Button>
      {plan.is_active ? (
        <ConfirmButton
          size="sm"
          variant="quiet"
          label="Deactivate"
          question={`Take ${plan.name} off sale?`}
          confirm="Deactivate"
          pending={busy(plan)}
          onConfirm={() => setActive.mutate({ plan, isActive: false })}
        />
      ) : (
        <Button size="sm" loading={busy(plan)} onClick={() => setActive.mutate({ plan, isActive: true })}>
          Activate
        </Button>
      )}
    </div>
  )

  const form = (plan?: MembershipPlan) => (
    <PlanForm
      plan={plan}
      pending={save.isPending}
      error={formError}
      onSubmit={(values) => save.mutate({ id: plan?.id ?? 'new', values })}
      onCancel={() => open(null)}
    />
  )

  const title = { all: 'All plans', true: 'Active', false: 'Inactive' }[active]

  return (
    <Page
      title="Plans"
      actions={
        <Button className="w-full lg:w-auto" aria-expanded={editing === 'new'} onClick={() => open('new')}>
          New plan
        </Button>
      }
    >
      {editing === 'new' && <section className={`${BOARD} bg-raised`}>{form()}</section>}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
        <div className="md:w-96">
          <ListSearch label="Search" placeholder="Plan name" value={search} onSearch={(term) => set('q', term)} />
        </div>
        <Segmented label="Status" name="plan-status" options={STATUS} value={active} onChange={(v) => set('active', v === 'all' ? null : v)} />
      </div>

      <Outcome outcome={outcome} />

      <div className={BOARD}>
        <Section title={title} count={list.data?.total} first>
          <ListBody query={list} what="plans" empty={search ? <>No plan matches “{search}”.</> : <>No plans yet. Create the first one with New plan.</>}>
            {(rows) => (
              <DataTable
                label="Plans"
                rows={rows}
                rowKey={(p) => p.id}
                expanded={(p) => editing === p.id && form(p)}
                columns={[
                  { header: 'Name', className: 'font-semibold', cell: (p) => p.name },
                  { header: 'Length', cell: (p) => formatMonths(p.duration_months) },
                  { header: 'Price', className: 'text-right tabular-nums', cell: (p) => formatINR(p.price) },
                  { header: 'Status', className: 'pl-10!', cell: (p) => <PlanStatus active={p.is_active} /> },
                  { header: '', className: 'w-[1%] whitespace-nowrap', cell: actions },
                ]}
                mobileRow={(p) => (
                  <StackedRow title={p.name} value={formatINR(p.price)} meta={formatMonths(p.duration_months)} status={<PlanStatus active={p.is_active} />}>
                    {actions(p)}
                  </StackedRow>
                )}
              />
            )}
          </ListBody>
        </Section>
      </div>

      <Pager page={page} total={list.data?.total ?? 0} onPage={setPage} />
    </Page>
  )
}
