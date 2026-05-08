import "server-only"

import { cache } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

export const getSession = cache(() => getServerSession(authOptions))
