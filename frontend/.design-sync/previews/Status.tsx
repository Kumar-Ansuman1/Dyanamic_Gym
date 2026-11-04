import { Status } from 'frontend'

export const Forms = () => (
  <div style={{ display: 'grid', gap: 12 }}>
    <Status form="solid" label="Active" />
    <Status form="dashed" label="Upcoming" />
    <Status form="hollow" label="Expired" />
    <Status form="struck" label="Cancelled" />
  </div>
)
