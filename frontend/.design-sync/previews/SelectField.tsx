import { SelectField } from 'frontend'

const box = { maxWidth: 420 } as const

export const Plan = () => (
  <div style={box}>
    <SelectField label="Plan" defaultValue="quarterly">
      <option value="monthly">Monthly · ₹1,200</option>
      <option value="quarterly">Quarterly · ₹3,000</option>
      <option value="half">Half-yearly · ₹5,500</option>
      <option value="annual">Annual · ₹10,000</option>
    </SelectField>
  </div>
)

export const WithError = () => (
  <div style={box}>
    <SelectField label="Plan" defaultValue="" error="Pick a plan to start the membership.">
      <option value="" disabled>
        Choose a plan
      </option>
      <option value="monthly">Monthly · ₹1,200</option>
      <option value="quarterly">Quarterly · ₹3,000</option>
    </SelectField>
  </div>
)
