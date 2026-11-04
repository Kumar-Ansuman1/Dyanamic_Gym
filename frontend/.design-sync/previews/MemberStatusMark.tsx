import { MemberStatusMark } from 'frontend'

export const ActiveAndInactive = () => (
  <div style={{ display: 'grid', gap: 12 }}>
    <MemberStatusMark active />
    <MemberStatusMark active={false} />
  </div>
)
