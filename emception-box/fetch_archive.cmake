include(FetchContent)

if(NOT FETCH_CACHE_DIR)
    set(FETCH_CACHE_DIR "${CMAKE_BINARY_DIR}/.fetch_cache")
endif()

file(MAKE_DIRECTORY "${FETCH_CACHE_DIR}")

function(fetch_archive GH_REPO COMMIT FILENAME_OUT_VAR)
    file(MAKE_DIRECTORY "${FETCH_CACHE_DIR}/${GH_REPO}")
    if(NOT EXISTS "${FETCH_CACHE_DIR}/${GH_REPO}/${COMMIT}.zip")
        file(DOWNLOAD "https://github.com/${GH_REPO}/archive/${COMMIT}.zip" "${FETCH_CACHE_DIR}/${GH_REPO}/${COMMIT}.zip" STATUS CACHED_FETCH_STATUS)
        list(GET CACHED_FETCH_STATUS 0 CACHED_FETCH_STATUS_CODE)
        if(NOT ("${CACHED_FETCH_STATUS_CODE}" EQUAL 0))
            message(FATAL_ERROR "Failed to download Binaryen: ${CACHED_FETCH_STATUS_CODE} :: ${CACHED_FETCH_STATUS}")
        endif()
    endif()
    set(${FILENAME_OUT_VAR} "${FETCH_CACHE_DIR}/${GH_REPO}/${COMMIT}.zip" PARENT_SCOPE)
endfunction()
