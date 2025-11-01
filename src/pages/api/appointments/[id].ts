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
