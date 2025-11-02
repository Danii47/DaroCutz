import { db } from "@/lib/db"
import { appointments } from "@/lib/db/schema"
import type { APIRoute } from "astro"
import { eq } from "drizzle-orm"

export const DELETE: APIRoute = async ({ params, locals }) => {
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
    const appointmentId = params.id

    if (!appointmentId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ID de cita no proporcionado"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    const [deletedAppointment] = await db
      .delete(appointments)
      .where(eq(appointments.id, appointmentId))
      .returning({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        status: appointments.status,
        createdAt: appointments.createdAt,
      })

    if (!deletedAppointment) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cita no encontrada"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cita eliminada exitosamente",
        appointment: deletedAppointment
      }),
      {
        status: 200,
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

export const PATCH: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user

  if (!currentUser) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "No estás autenticado"
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" }
      }
    )
  }

  const appointmentId = params.id

  if (!appointmentId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "ID de cita no proporcionado"
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    )
  }


  try {
    const [appointmentByUser] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.userId, currentUser.id))

    if (appointmentByUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ya tienes una cita reservada"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    const [appointment] = await db
      .select({
        id: appointments.id,
        userId: appointments.userId,
      })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))

    if (!appointment) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cita no encontrada"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    if (appointment.userId !== null) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "La cita ya está reservada"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    const [updatedAppointment] = await db
      .update(appointments)
      .set({
        userId: currentUser.id,
        status: "confirmed"
      })
      .where(eq(appointments.id, appointmentId))
      .returning({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        status: appointments.status,
        createdAt: appointments.createdAt,
      })

    if (!updatedAppointment) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cita no encontrada"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cita actualizada exitosamente",
        appointment: updatedAppointment
      }),
      {
        status: 200,
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