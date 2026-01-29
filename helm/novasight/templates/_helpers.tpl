{{/*
Expand the name of the chart.
*/}}
{{- define "novasight.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "novasight.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "novasight.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "novasight.labels" -}}
helm.sh/chart: {{ include "novasight.chart" . }}
{{ include "novasight.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "novasight.selectorLabels" -}}
app.kubernetes.io/name: {{ include "novasight.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "novasight.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "novasight.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Backend fullname
*/}}
{{- define "novasight.backend.fullname" -}}
{{- printf "%s-backend" (include "novasight.fullname" .) }}
{{- end }}

{{/*
Frontend fullname
*/}}
{{- define "novasight.frontend.fullname" -}}
{{- printf "%s-frontend" (include "novasight.fullname" .) }}
{{- end }}

{{/*
Backend labels
*/}}
{{- define "novasight.backend.labels" -}}
{{ include "novasight.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "novasight.backend.selectorLabels" -}}
{{ include "novasight.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "novasight.frontend.labels" -}}
{{ include "novasight.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "novasight.frontend.selectorLabels" -}}
{{ include "novasight.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Create the image path for a component.
*/}}
{{- define "novasight.image" -}}
{{- $registryName := .global.imageRegistry -}}
{{- $repositoryName := .image.repository -}}
{{- $tag := .image.tag | default "latest" -}}
{{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- end }}

{{/*
Return the proper image pull secrets
*/}}
{{- define "novasight.imagePullSecrets" -}}
{{- if .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- range .Values.global.imagePullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end }}
{{- end }}

{{/*
PostgreSQL host
*/}}
{{- define "novasight.postgresql.host" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" (include "novasight.fullname" .) }}
{{- else }}
{{- .Values.externalDatabase.host }}
{{- end }}
{{- end }}

{{/*
PostgreSQL port
*/}}
{{- define "novasight.postgresql.port" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "5432" }}
{{- else }}
{{- .Values.externalDatabase.port | default "5432" }}
{{- end }}
{{- end }}

{{/*
Redis host
*/}}
{{- define "novasight.redis.host" -}}
{{- if .Values.redis.enabled }}
{{- printf "%s-redis-master" (include "novasight.fullname" .) }}
{{- else }}
{{- .Values.externalRedis.host }}
{{- end }}
{{- end }}

{{/*
Redis port
*/}}
{{- define "novasight.redis.port" -}}
{{- if .Values.redis.enabled }}
{{- printf "6379" }}
{{- else }}
{{- .Values.externalRedis.port | default "6379" }}
{{- end }}
{{- end }}

{{/*
ClickHouse host
*/}}
{{- define "novasight.clickhouse.host" -}}
{{- if .Values.clickhouse.enabled }}
{{- printf "%s-clickhouse" (include "novasight.fullname" .) }}
{{- else }}
{{- .Values.externalClickhouse.host }}
{{- end }}
{{- end }}

{{/*
Return the appropriate apiVersion for HPA
*/}}
{{- define "novasight.hpa.apiVersion" -}}
{{- if .Capabilities.APIVersions.Has "autoscaling/v2" }}
{{- print "autoscaling/v2" }}
{{- else }}
{{- print "autoscaling/v2beta2" }}
{{- end }}
{{- end }}

{{/*
Return the appropriate apiVersion for PDB
*/}}
{{- define "novasight.pdb.apiVersion" -}}
{{- if .Capabilities.APIVersions.Has "policy/v1" }}
{{- print "policy/v1" }}
{{- else }}
{{- print "policy/v1beta1" }}
{{- end }}
{{- end }}

{{/*
Return the appropriate apiVersion for Ingress
*/}}
{{- define "novasight.ingress.apiVersion" -}}
{{- if .Capabilities.APIVersions.Has "networking.k8s.io/v1" }}
{{- print "networking.k8s.io/v1" }}
{{- else if .Capabilities.APIVersions.Has "networking.k8s.io/v1beta1" }}
{{- print "networking.k8s.io/v1beta1" }}
{{- else }}
{{- print "extensions/v1beta1" }}
{{- end }}
{{- end }}

{{/*
Common annotations
*/}}
{{- define "novasight.annotations" -}}
{{- with .Values.commonAnnotations }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Pod Security Context
*/}}
{{- define "novasight.podSecurityContext" -}}
{{- with .Values.podSecurityContext }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Container Security Context
*/}}
{{- define "novasight.securityContext" -}}
{{- with .Values.securityContext }}
{{ toYaml . }}
{{- end }}
{{- end }}
