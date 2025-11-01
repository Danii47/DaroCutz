import { db } from "@/lib/db"
import { appointments } from "@/lib/db/schema"
import type { APIRoute } from "astro"

export const GET: APIRoute = async ({ locals }) => {
  const currentUser = locals.user

  if (!currentUser) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "No autenticado"
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    )
  }

  try {
    const appointmentsList = await db
      .select()
      .from(appointments)
      .orderBy(appointments.appointmentDate)

    return new Response(
      JSON.stringify({
        success: true,
        appointments: appointmentsList
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    )
  } catch (error) {
    console.log(error)
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user

  if (!currentUser || !currentUser.isAdmin) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "No tienes permisos para acceder a este recurso"
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" }
      }
    )
  }

  try {
    const data = await request.json()
    const { date, time } = data
    if (!date || !time) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Datos inválidos. Verifica que todos los campos sean correctos."
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    const timestamp = new Date(`${date}T${time}:00`)

    if (timestamp < new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "La fecha y hora de la cita deben ser futuras."
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    const [newAppointment] = await db
      .insert(appointments)
      .values({
        appointmentDate: timestamp
      })
      .returning({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        status: appointments.status,
        createdAt: appointments.createdAt,
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cita creada exitosamente",
        appointment: newAppointment
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.log(error)
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}