import { getSessionFormData } from '@/app/actions/sessions'
import NewSessionForm from './new-session-form'

export default async function NewSessionPage() {
  const { clients, packages, staff } = await getSessionFormData()
  return <NewSessionForm clients={clients} packages={packages} staff={staff} />
}
