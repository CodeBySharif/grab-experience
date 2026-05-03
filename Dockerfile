# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy only the project file first for efficient caching
COPY ["backend/Backend.csproj", "backend/"]
RUN dotnet restore "backend/Backend.csproj"

# Copy the rest of the backend files
COPY backend/ backend/
WORKDIR /src/backend
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Environment variables for production
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

# Entry point
ENTRYPOINT ["dotnet", "Backend.dll"]
