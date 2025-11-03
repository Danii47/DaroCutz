import { db } from "@/lib/db"
import { appointments, users } from "@/lib/db/schema"
import type { APIRoute } from "astro"
import { and, eq, gt, gte, isNotNull } from "drizzle-orm"
import { fromZonedTime } from 'date-fns-tz'

export const GET: APIRoute = async ({ url, locals }) => {
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
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const type = url.searchParams.get("type") || "all"

    if (type === "all") {
      const appointmentsList = await db
        .select()
        .from(appointments)
        .where(gt(appointments.appointmentDate, tomorrow))
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
    } else if (type === "reserved") {
      if (!currentUser.isAdmin) {
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

      const appointmentsList = await db
        .select({
          id: appointments.id,
          appointmentDate: appointments.appointmentDate,
          status: appointments.status,
          createdAt: appointments.createdAt,
          userId: appointments.userId,
          userName: users.fullName,
          userPhone: users.phone
        })
        .from(appointments)
        .leftJoin(users, eq(appointments.userId, users.id))
        .where(and(
          gte(appointments.appointmentDate, new Date()),
          isNotNull(appointments.userId)
        ))
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

    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Tipo de consulta inválido"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    }
  } catch (error) {
    console.error(error)
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

    const timestamp = fromZonedTime(`${date}T${time}:00`, 'Europe/Madrid')

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

    const today = new Date();

    if (timestamp.getDate() === today.getDate() &&
      timestamp.getMonth() === today.getMonth() &&
      timestamp.getFullYear() === today.getFullYear()) {

      return new Response(
        JSON.stringify({
          success: false,
          error: "La cita no puede ser para el día de hoy."
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    const [appointmentExists] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.appointmentDate, timestamp))

    if (appointmentExists) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ya existe una cita en esa fecha y hora."
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
    console.error(error)
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